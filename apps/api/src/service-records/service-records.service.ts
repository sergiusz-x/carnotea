import { parts, serviceParts, serviceRecords, vehicles, type Db } from '@carnotea/db';
import { type ServiceRecordCreate, type ServiceRecordUpdate } from '@carnotea/shared';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';
import { CostSyncService } from '../expenses/cost-sync.service.js';
import { type DbTx, MileageSyncService } from '../mileage/mileage-sync.service.js';

export interface ServicePartLineResponse {
  id: string;
  serviceRecordId: string;
  partId: string;
  name: string;
  manufacturer: string | null;
  partNumber: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ServiceRecordResponse {
  id: string;
  vehicleId: string;
  serviceDate: string;
  mileage: number;
  title: string;
  description: string | null;
  laborCost: number;
  totalCost: number;
  workshopName: string | null;
  parts: ServicePartLineResponse[];
  createdAt: string;
  updatedAt: string;
}

interface ServiceRecordRow {
  id: string;
  vehicleId: string;
  serviceDate: string;
  mileage: number;
  title: string;
  description: string | null;
  laborCost: string;
  totalCost: string;
  workshopName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ServicePartJoinRow {
  id: string;
  serviceRecordId: string;
  partId: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  name: string;
  manufacturer: string | null;
  partNumber: string | null;
}

/** Compute `round(a * b, 2)` matching the DB `round(a*b, 2)`. */
export function computeTotalPrice(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

interface PartLineInput {
  name: string;
  manufacturer?: string | null;
  partNumber?: string | null;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class ServiceRecordsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly mileageSync: MileageSyncService,
    private readonly costSync: CostSyncService,
  ) {}

  async list(userId: string, vehicleId: string): Promise<ServiceRecordResponse[]> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select()
      .from(serviceRecords)
      .where(eq(serviceRecords.vehicleId, vehicleId))
      .orderBy(desc(serviceRecords.serviceDate), desc(serviceRecords.mileage));

    const recordIds = rows.map((r) => r.id);
    const partsByRecord = await this.fetchPartsByRecordIds(recordIds);

    return rows.map((row) => this.toResponse(row, partsByRecord.get(row.id) ?? []));
  }

  async getOwnedOrThrow(
    userId: string,
    vehicleId: string,
    id: string,
  ): Promise<ServiceRecordResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select()
      .from(serviceRecords)
      .where(and(eq(serviceRecords.id, id), eq(serviceRecords.vehicleId, vehicleId)))
      .limit(1);

    const row = rows.at(0);
    if (!row) throw this.notFound();

    const partLines = await this.fetchPartsByRecordId(id);
    return this.toResponse(row, partLines);
  }

  async create(
    userId: string,
    vehicleId: string,
    input: ServiceRecordCreate,
  ): Promise<ServiceRecordResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const createdId = await this.db.transaction(async (tx: DbTx) => {
      const partLines: Array<{
        partId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      if (input.parts) {
        for (const line of input.parts) {
          const partLineInput: PartLineInput = {
            name: line.name,
            manufacturer: line.manufacturer,
            partNumber: line.partNumber,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          };
          const resolvedPartId = await this.resolveOrCreatePart(tx, partLineInput);
          const totalPrice = computeTotalPrice(partLineInput.quantity, partLineInput.unitPrice);
          partLines.push({
            partId: resolvedPartId,
            quantity: partLineInput.quantity,
            unitPrice: partLineInput.unitPrice,
            totalPrice,
          });
        }
      }

      const sumPartsTotal = partLines.reduce((acc, l) => acc + l.totalPrice, 0);
      const laborCost = input.laborCost;
      const totalCost = laborCost + sumPartsTotal;

      // Insert the service record
      const inserted = await tx
        .insert(serviceRecords)
        .values({
          vehicleId,
          serviceDate: input.serviceDate,
          mileage: input.mileage,
          title: input.title,
          description: input.description ?? null,
          laborCost: String(laborCost),
          totalCost: String(totalCost),
          workshopName: input.workshopName ?? null,
        })
        .returning({ id: serviceRecords.id });

      const record = inserted.at(0);
      if (!record) throw new Error('Service record insert returned no row');

      // Insert part lines
      for (const line of partLines) {
        try {
          await tx.insert(serviceParts).values({
            serviceRecordId: record.id,
            partId: line.partId,
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            totalPrice: String(line.totalPrice),
          });
        } catch (err: unknown) {
          if (isUniqueViolation(err)) {
            throw new ConflictException({
              code: 'CONFLICT',
              message: 'Duplicate part line: this part is already linked to this service record',
            });
          }
          throw err;
        }
      }

      await this.mileageSync.syncDerivedReading(tx, {
        vehicleId,
        sourceType: 'service_record',
        sourceId: record.id,
        mileage: input.mileage,
        date: input.serviceDate,
      });

      await this.costSync.upsertFromSource(tx, {
        vehicleId,
        sourceType: 'service_record',
        sourceId: record.id,
        amount: totalCost,
        date: input.serviceDate,
        categoryCode: 'service',
      });

      return record.id;
    });

    return this.getOwnedOrThrow(userId, vehicleId, createdId);
  }

  async update(
    userId: string,
    vehicleId: string,
    id: string,
    input: ServiceRecordUpdate,
  ): Promise<ServiceRecordResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const current = await this.db
      .select()
      .from(serviceRecords)
      .where(and(eq(serviceRecords.id, id), eq(serviceRecords.vehicleId, vehicleId)))
      .limit(1);

    const existing = current.at(0);
    if (!existing) throw this.notFound();

    const newLaborCost = input.laborCost ?? Number(existing.laborCost);
    const newMileage = input.mileage ?? existing.mileage;
    const newServiceDate = input.serviceDate ?? existing.serviceDate;

    await this.db.transaction(async (tx: DbTx) => {
      const updates: Partial<typeof serviceRecords.$inferInsert> = {};
      if (input.serviceDate !== undefined) updates.serviceDate = input.serviceDate;
      if (input.mileage !== undefined) updates.mileage = input.mileage;
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description ?? null;
      if (input.laborCost !== undefined) updates.laborCost = String(input.laborCost);
      if (input.workshopName !== undefined) updates.workshopName = input.workshopName ?? null;

      // Recompute totalCost from current parts + new laborCost
      const currentParts = await tx
        .select({ totalPrice: serviceParts.totalPrice })
        .from(serviceParts)
        .where(eq(serviceParts.serviceRecordId, id));

      const partsTotal = currentParts.reduce((acc, p) => acc + Number(p.totalPrice), 0);
      updates.totalCost = String(newLaborCost + partsTotal);
      updates.updatedAt = new Date();

      const affected = await tx
        .update(serviceRecords)
        .set(updates)
        .where(and(eq(serviceRecords.id, id), eq(serviceRecords.vehicleId, vehicleId)))
        .returning({ id: serviceRecords.id });

      if (affected.length === 0) throw this.notFound();

      await this.mileageSync.syncDerivedReading(tx, {
        vehicleId,
        sourceType: 'service_record',
        sourceId: id,
        mileage: newMileage,
        date: newServiceDate,
      });

      await this.costSync.upsertFromSource(tx, {
        vehicleId,
        sourceType: 'service_record',
        sourceId: id,
        amount: Number(updates.totalCost ?? existing.totalCost),
        date: newServiceDate,
        categoryCode: 'service',
      });
    });

    return this.getOwnedOrThrow(userId, vehicleId, id);
  }

  async remove(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.assertVehicleOwned(userId, vehicleId);

    await this.db.transaction(async (tx: DbTx) => {
      const deleted = await tx
        .delete(serviceRecords)
        .where(and(eq(serviceRecords.id, id), eq(serviceRecords.vehicleId, vehicleId)))
        .returning({ id: serviceRecords.id });

      if (deleted.length === 0) throw this.notFound();

      await this.mileageSync.removeDerivedReading(tx, {
        vehicleId,
        sourceType: 'service_record',
        sourceId: id,
      });

      await this.costSync.removeForSource(tx, {
        sourceType: 'service_record',
        sourceId: id,
      });
    });
  }

  private async resolveOrCreatePart(tx: DbTx, line: PartLineInput): Promise<string> {
    // If manufacturer and partNumber are both provided, try to find existing
    if (line.manufacturer && line.partNumber) {
      const existing = await tx
        .select({ id: parts.id })
        .from(parts)
        .where(
          and(eq(parts.manufacturer, line.manufacturer), eq(parts.partNumber, line.partNumber)),
        )
        .limit(1);

      const found = existing.at(0);
      if (found) return found.id;
    }

    // Create a new part
    const inserted = await tx
      .insert(parts)
      .values({
        name: line.name,
        manufacturer: line.manufacturer ?? null,
        partNumber: line.partNumber ?? null,
      })
      .returning({ id: parts.id });

    const created = inserted.at(0);
    if (!created) throw new Error('Part insert returned no row');
    return created.id;
  }

  private async fetchPartsByRecordIds(
    recordIds: string[],
  ): Promise<Map<string, ServicePartLineResponse[]>> {
    if (recordIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        id: serviceParts.id,
        serviceRecordId: serviceParts.serviceRecordId,
        partId: serviceParts.partId,
        quantity: serviceParts.quantity,
        unitPrice: serviceParts.unitPrice,
        totalPrice: serviceParts.totalPrice,
        name: parts.name,
        manufacturer: parts.manufacturer,
        partNumber: parts.partNumber,
      })
      .from(serviceParts)
      .innerJoin(parts, eq(serviceParts.partId, parts.id))
      .where(inArray(serviceParts.serviceRecordId, recordIds));

    const map = new Map<string, ServicePartLineResponse[]>();
    for (const row of rows) {
      const existing = map.get(row.serviceRecordId) ?? [];
      existing.push(this.toPartResponse(row));
      map.set(row.serviceRecordId, existing);
    }
    return map;
  }

  private async fetchPartsByRecordId(recordId: string): Promise<ServicePartLineResponse[]> {
    const rows = await this.db
      .select({
        id: serviceParts.id,
        serviceRecordId: serviceParts.serviceRecordId,
        partId: serviceParts.partId,
        quantity: serviceParts.quantity,
        unitPrice: serviceParts.unitPrice,
        totalPrice: serviceParts.totalPrice,
        name: parts.name,
        manufacturer: parts.manufacturer,
        partNumber: parts.partNumber,
      })
      .from(serviceParts)
      .innerJoin(parts, eq(serviceParts.partId, parts.id))
      .where(eq(serviceParts.serviceRecordId, recordId));

    return rows.map((row) => this.toPartResponse(row));
  }

  private async assertVehicleOwned(userId: string, vehicleId: string): Promise<void> {
    const rows = await this.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);
    if (!rows.at(0)) throw this.notFound();
  }

  private toResponse(
    row: ServiceRecordRow,
    partLines: ServicePartLineResponse[],
  ): ServiceRecordResponse {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      serviceDate: row.serviceDate,
      mileage: row.mileage,
      title: row.title,
      description: row.description,
      laborCost: Number(row.laborCost),
      totalCost: Number(row.totalCost),
      workshopName: row.workshopName,
      parts: partLines,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPartResponse(row: ServicePartJoinRow): ServicePartLineResponse {
    return {
      id: row.id,
      serviceRecordId: row.serviceRecordId,
      partId: row.partId,
      name: row.name,
      manufacturer: row.manufacturer,
      partNumber: row.partNumber,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      totalPrice: Number(row.totalPrice),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Service record not found' });
  }
}

/** Check if an error is a Postgres unique-violation (SQLSTATE `23505`). */
function isUniqueViolation(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (e.code === '23505') return true;
    if (typeof e.message === 'string' && e.message.includes('duplicate key')) return true;
  }
  return false;
}
