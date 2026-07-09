import { fluidLogs, fluidTypes, vehicles, type Db } from '@carnotea/db';
import { type FluidLogCreate, type FluidLogUpdate } from '@carnotea/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';
import { CostSyncService } from '../expenses/cost-sync.service.js';
import { type DbTx } from '../mileage/mileage-sync.service.js';

export interface FluidLogResponse {
  id: string;
  vehicleId: string;
  changeDate: string;
  mileage: number;
  fluidType: string;
  quantityLiters: number | null;
  cost: number | null;
  intervalKm: number | null;
  intervalMonths: number | null;
  workshopName: string | null;
  notes: string | null;
  nextDueMileage: number | null;
  nextDueDate: string | null;
  createdAt: string;
}

interface FluidLogRow {
  id: string;
  vehicleId: string;
  changeDate: string;
  mileage: number;
  fluidType: string;
  quantityLiters: string | null;
  cost: string | null;
  intervalKm: number | null;
  intervalMonths: number | null;
  workshopName: string | null;
  notes: string | null;
  createdAt: Date;
}

/** `changeDate + intervalMonths`, formatted as `YYYY-MM-DD`. */
function addMonths(dateStr: string, months: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class FluidLogsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly costSync: CostSyncService,
  ) {}

  async list(userId: string, vehicleId: string): Promise<FluidLogResponse[]> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select({
        id: fluidLogs.id,
        vehicleId: fluidLogs.vehicleId,
        changeDate: fluidLogs.changeDate,
        mileage: fluidLogs.mileage,
        fluidType: fluidTypes.code,
        quantityLiters: fluidLogs.quantityLiters,
        cost: fluidLogs.cost,
        intervalKm: fluidLogs.intervalKm,
        intervalMonths: fluidLogs.intervalMonths,
        workshopName: fluidLogs.workshopName,
        notes: fluidLogs.notes,
        createdAt: fluidLogs.createdAt,
      })
      .from(fluidLogs)
      .innerJoin(fluidTypes, eq(fluidLogs.fluidTypeId, fluidTypes.id))
      .where(eq(fluidLogs.vehicleId, vehicleId))
      .orderBy(desc(fluidLogs.changeDate), desc(fluidLogs.mileage));

    return rows.map((row) => this.toResponse(row));
  }

  async getOwnedOrThrow(userId: string, vehicleId: string, id: string): Promise<FluidLogResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select({
        id: fluidLogs.id,
        vehicleId: fluidLogs.vehicleId,
        changeDate: fluidLogs.changeDate,
        mileage: fluidLogs.mileage,
        fluidType: fluidTypes.code,
        quantityLiters: fluidLogs.quantityLiters,
        cost: fluidLogs.cost,
        intervalKm: fluidLogs.intervalKm,
        intervalMonths: fluidLogs.intervalMonths,
        workshopName: fluidLogs.workshopName,
        notes: fluidLogs.notes,
        createdAt: fluidLogs.createdAt,
      })
      .from(fluidLogs)
      .innerJoin(fluidTypes, eq(fluidLogs.fluidTypeId, fluidTypes.id))
      .where(and(eq(fluidLogs.id, id), eq(fluidLogs.vehicleId, vehicleId)))
      .limit(1);

    const row = rows.at(0);
    if (!row) throw this.notFound();

    return this.toResponse(row);
  }

  async create(
    userId: string,
    vehicleId: string,
    input: FluidLogCreate,
  ): Promise<FluidLogResponse> {
    await this.assertVehicleOwned(userId, vehicleId);
    const fluidTypeId = await this.resolveFluidTypeId(input.fluidType);

    const createdId = await this.db.transaction(async (tx: DbTx) => {
      const inserted = await tx
        .insert(fluidLogs)
        .values({
          vehicleId,
          fluidTypeId,
          changeDate: input.changeDate,
          mileage: input.mileage,
          quantityLiters: input.quantityLiters != null ? String(input.quantityLiters) : null,
          cost: input.cost != null ? String(input.cost) : null,
          intervalKm: input.intervalKm ?? null,
          intervalMonths: input.intervalMonths ?? null,
          workshopName: input.workshopName ?? null,
          notes: input.notes ?? null,
        })
        .returning({ id: fluidLogs.id });

      const created = inserted.at(0);
      if (!created) throw new Error('Fluid log insert returned no row');

      if (input.cost != null) {
        await this.costSync.upsertFromSource(tx, {
          vehicleId,
          sourceType: 'fluid_log',
          sourceId: created.id,
          amount: input.cost,
          date: input.changeDate,
          categoryCode: 'fluids',
        });
      }

      return created.id;
    });

    return this.getOwnedOrThrow(userId, vehicleId, createdId);
  }

  async update(
    userId: string,
    vehicleId: string,
    id: string,
    input: FluidLogUpdate,
  ): Promise<FluidLogResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const current = await this.db
      .select()
      .from(fluidLogs)
      .where(and(eq(fluidLogs.id, id), eq(fluidLogs.vehicleId, vehicleId)))
      .limit(1);

    const existing = current.at(0);
    if (!existing) throw this.notFound();

    const newChangeDate = input.changeDate ?? existing.changeDate;
    const resolvedCost =
      input.cost !== undefined ? input.cost : existing.cost != null ? Number(existing.cost) : null;

    await this.db.transaction(async (tx: DbTx) => {
      const updates: Partial<typeof fluidLogs.$inferInsert> = {};
      if (input.changeDate !== undefined) updates.changeDate = input.changeDate;
      if (input.mileage !== undefined) updates.mileage = input.mileage;
      if (input.fluidType !== undefined) {
        updates.fluidTypeId = await this.resolveFluidTypeId(input.fluidType);
      }
      if (input.quantityLiters !== undefined) {
        updates.quantityLiters = input.quantityLiters != null ? String(input.quantityLiters) : null;
      }
      if (input.cost !== undefined) {
        updates.cost = input.cost != null ? String(input.cost) : null;
      }
      if (input.intervalKm !== undefined) updates.intervalKm = input.intervalKm;
      if (input.intervalMonths !== undefined) updates.intervalMonths = input.intervalMonths;
      if (input.workshopName !== undefined) updates.workshopName = input.workshopName;
      if (input.notes !== undefined) updates.notes = input.notes;

      const affected = await tx
        .update(fluidLogs)
        .set(updates)
        .where(and(eq(fluidLogs.id, id), eq(fluidLogs.vehicleId, vehicleId)))
        .returning({ id: fluidLogs.id });

      if (affected.length === 0) throw this.notFound();

      if (resolvedCost != null) {
        await this.costSync.upsertFromSource(tx, {
          vehicleId,
          sourceType: 'fluid_log',
          sourceId: id,
          amount: resolvedCost,
          date: newChangeDate,
          categoryCode: 'fluids',
        });
      } else {
        await this.costSync.removeForSource(tx, { sourceType: 'fluid_log', sourceId: id });
      }
    });

    return this.getOwnedOrThrow(userId, vehicleId, id);
  }

  async remove(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.assertVehicleOwned(userId, vehicleId);

    await this.db.transaction(async (tx: DbTx) => {
      const deleted = await tx
        .delete(fluidLogs)
        .where(and(eq(fluidLogs.id, id), eq(fluidLogs.vehicleId, vehicleId)))
        .returning({ id: fluidLogs.id });

      if (deleted.length === 0) throw this.notFound();

      await this.costSync.removeForSource(tx, { sourceType: 'fluid_log', sourceId: id });
    });
  }

  private async assertVehicleOwned(userId: string, vehicleId: string): Promise<void> {
    const rows = await this.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);
    if (!rows.at(0)) throw this.notFound();
  }

  private async resolveFluidTypeId(code: string): Promise<number> {
    const rows = await this.db
      .select({ id: fluidTypes.id })
      .from(fluidTypes)
      .where(eq(fluidTypes.code, code))
      .limit(1);
    const found = rows.at(0);
    if (!found) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Unknown fluid type: ${code}`,
      });
    }
    return found.id;
  }

  private toResponse(row: FluidLogRow): FluidLogResponse {
    const intervalKm = row.intervalKm;
    const intervalMonths = row.intervalMonths;
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      changeDate: row.changeDate,
      mileage: row.mileage,
      fluidType: row.fluidType,
      quantityLiters: row.quantityLiters != null ? Number(row.quantityLiters) : null,
      cost: row.cost != null ? Number(row.cost) : null,
      intervalKm,
      intervalMonths,
      workshopName: row.workshopName,
      notes: row.notes,
      nextDueMileage: intervalKm != null ? row.mileage + intervalKm : null,
      nextDueDate: intervalMonths != null ? addMonths(row.changeDate, intervalMonths) : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Fluid log not found' });
  }
}
