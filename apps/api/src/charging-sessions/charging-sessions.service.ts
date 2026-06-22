import { chargerTypes, chargingSessions, vehicles, type Db } from '@carnotea/db';
import { type ChargingSessionCreate, type ChargingSessionUpdate } from '@carnotea/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';
import { CostSyncService } from '../expenses/cost-sync.service.js';
import { type DbTx, MileageSyncService } from '../mileage/mileage-sync.service.js';

export interface ChargingSessionResponse {
  id: string;
  vehicleId: string;
  chargeDate: string;
  mileage: number;
  energyKwh: number;
  pricePerKwh: number;
  totalCost: number;
  chargerType: string;
  socStartPercent: number | null;
  socEndPercent: number | null;
  stationName: string | null;
  isFullCharge: boolean;
  createdAt: string;
}

interface ChargingSessionRow {
  id: string;
  vehicleId: string;
  chargeDate: string;
  mileage: number;
  energyKwh: string;
  pricePerKwh: string;
  totalCost: string;
  chargerType: string;
  socStartPercent: number | null;
  socEndPercent: number | null;
  stationName: string | null;
  isFullCharge: boolean;
  createdAt: Date;
}

export function computeTotalCost(energyKwh: number, pricePerKwh: number): number {
  return Math.round(energyKwh * pricePerKwh * 100) / 100;
}

@Injectable()
export class ChargingSessionsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly mileageSync: MileageSyncService,
    private readonly costSync: CostSyncService,
  ) {}

  async list(userId: string, vehicleId: string): Promise<ChargingSessionResponse[]> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select({
        id: chargingSessions.id,
        vehicleId: chargingSessions.vehicleId,
        chargeDate: chargingSessions.chargeDate,
        mileage: chargingSessions.mileage,
        energyKwh: chargingSessions.energyKwh,
        pricePerKwh: chargingSessions.pricePerKwh,
        totalCost: chargingSessions.totalCost,
        chargerType: chargerTypes.code,
        socStartPercent: chargingSessions.socStartPercent,
        socEndPercent: chargingSessions.socEndPercent,
        stationName: chargingSessions.stationName,
        isFullCharge: chargingSessions.isFullCharge,
        createdAt: chargingSessions.createdAt,
      })
      .from(chargingSessions)
      .innerJoin(chargerTypes, eq(chargingSessions.chargerTypeId, chargerTypes.id))
      .where(eq(chargingSessions.vehicleId, vehicleId))
      .orderBy(desc(chargingSessions.chargeDate), desc(chargingSessions.mileage));

    return rows.map((row) => this.toResponse(row));
  }

  async getOwnedOrThrow(
    userId: string,
    vehicleId: string,
    id: string,
  ): Promise<ChargingSessionResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select({
        id: chargingSessions.id,
        vehicleId: chargingSessions.vehicleId,
        chargeDate: chargingSessions.chargeDate,
        mileage: chargingSessions.mileage,
        energyKwh: chargingSessions.energyKwh,
        pricePerKwh: chargingSessions.pricePerKwh,
        totalCost: chargingSessions.totalCost,
        chargerType: chargerTypes.code,
        socStartPercent: chargingSessions.socStartPercent,
        socEndPercent: chargingSessions.socEndPercent,
        stationName: chargingSessions.stationName,
        isFullCharge: chargingSessions.isFullCharge,
        createdAt: chargingSessions.createdAt,
      })
      .from(chargingSessions)
      .innerJoin(chargerTypes, eq(chargingSessions.chargerTypeId, chargerTypes.id))
      .where(and(eq(chargingSessions.id, id), eq(chargingSessions.vehicleId, vehicleId)))
      .limit(1);

    const row = rows.at(0);
    if (!row) throw this.notFound();

    return this.toResponse(row);
  }

  async create(
    userId: string,
    vehicleId: string,
    input: ChargingSessionCreate,
  ): Promise<ChargingSessionResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const chargerTypeId = await this.resolveChargerTypeId(input.chargerType);
    const totalCost = computeTotalCost(input.energyKwh, input.pricePerKwh);

    const createdId = await this.db.transaction(async (tx: DbTx) => {
      const inserted = await tx
        .insert(chargingSessions)
        .values({
          vehicleId,
          chargeDate: input.chargeDate,
          mileage: input.mileage,
          energyKwh: String(input.energyKwh),
          pricePerKwh: String(input.pricePerKwh),
          totalCost: String(totalCost),
          chargerTypeId,
          socStartPercent: input.socStartPercent ?? null,
          socEndPercent: input.socEndPercent ?? null,
          stationName: input.stationName ?? null,
          isFullCharge: input.isFullCharge,
        })
        .returning({ id: chargingSessions.id });

      const created = inserted.at(0);
      if (!created) throw new Error('Charging session insert returned no row');

      await this.mileageSync.syncDerivedReading(tx, {
        vehicleId,
        sourceType: 'charging_session',
        sourceId: created.id,
        mileage: input.mileage,
        date: input.chargeDate,
      });

      await this.costSync.upsertFromSource(tx, {
        vehicleId,
        sourceType: 'charging_session',
        sourceId: created.id,
        amount: totalCost,
        date: input.chargeDate,
        categoryCode: 'electricity',
      });

      return created.id;
    });

    return this.getOwnedOrThrow(userId, vehicleId, createdId);
  }

  async update(
    userId: string,
    vehicleId: string,
    id: string,
    input: ChargingSessionUpdate,
  ): Promise<ChargingSessionResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const current = await this.db
      .select({
        id: chargingSessions.id,
        energyKwh: chargingSessions.energyKwh,
        pricePerKwh: chargingSessions.pricePerKwh,
        mileage: chargingSessions.mileage,
        chargeDate: chargingSessions.chargeDate,
        chargerTypeId: chargingSessions.chargerTypeId,
        socStartPercent: chargingSessions.socStartPercent,
        socEndPercent: chargingSessions.socEndPercent,
        stationName: chargingSessions.stationName,
        isFullCharge: chargingSessions.isFullCharge,
      })
      .from(chargingSessions)
      .where(and(eq(chargingSessions.id, id), eq(chargingSessions.vehicleId, vehicleId)))
      .limit(1);

    const existing = current.at(0);
    if (!existing) throw this.notFound();

    const newEnergyKwh = input.energyKwh ?? Number(existing.energyKwh);
    const newPricePerKwh = input.pricePerKwh ?? Number(existing.pricePerKwh);
    const newMileage = input.mileage ?? existing.mileage;
    const newChargeDate = input.chargeDate ?? existing.chargeDate;
    const totalCost = computeTotalCost(newEnergyKwh, newPricePerKwh);

    await this.db.transaction(async (tx: DbTx) => {
      const updates: Partial<typeof chargingSessions.$inferInsert> = {};
      if (input.chargeDate !== undefined) updates.chargeDate = input.chargeDate;
      if (input.mileage !== undefined) updates.mileage = input.mileage;
      if (input.energyKwh !== undefined) updates.energyKwh = String(input.energyKwh);
      if (input.pricePerKwh !== undefined) updates.pricePerKwh = String(input.pricePerKwh);
      if (input.chargerType !== undefined) {
        updates.chargerTypeId = await this.resolveChargerTypeId(input.chargerType);
      }
      if (input.socStartPercent !== undefined)
        updates.socStartPercent = input.socStartPercent ?? null;
      if (input.socEndPercent !== undefined) updates.socEndPercent = input.socEndPercent ?? null;
      if (input.stationName !== undefined) updates.stationName = input.stationName ?? null;
      if (input.isFullCharge !== undefined) updates.isFullCharge = input.isFullCharge;
      updates.totalCost = String(totalCost);

      const affected = await tx
        .update(chargingSessions)
        .set(updates)
        .where(and(eq(chargingSessions.id, id), eq(chargingSessions.vehicleId, vehicleId)))
        .returning({ id: chargingSessions.id });

      if (affected.length === 0) throw this.notFound();

      await this.mileageSync.syncDerivedReading(tx, {
        vehicleId,
        sourceType: 'charging_session',
        sourceId: id,
        mileage: newMileage,
        date: newChargeDate,
      });

      await this.costSync.upsertFromSource(tx, {
        vehicleId,
        sourceType: 'charging_session',
        sourceId: id,
        amount: totalCost,
        date: newChargeDate,
        categoryCode: 'electricity',
      });
    });

    return this.getOwnedOrThrow(userId, vehicleId, id);
  }

  async remove(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.assertVehicleOwned(userId, vehicleId);

    await this.db.transaction(async (tx: DbTx) => {
      const deleted = await tx
        .delete(chargingSessions)
        .where(and(eq(chargingSessions.id, id), eq(chargingSessions.vehicleId, vehicleId)))
        .returning({ id: chargingSessions.id });

      if (deleted.length === 0) throw this.notFound();

      await this.mileageSync.removeDerivedReading(tx, {
        vehicleId,
        sourceType: 'charging_session',
        sourceId: id,
      });

      await this.costSync.removeForSource(tx, {
        sourceType: 'charging_session',
        sourceId: id,
      });
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

  private async resolveChargerTypeId(code: string): Promise<number> {
    const rows = await this.db
      .select({ id: chargerTypes.id })
      .from(chargerTypes)
      .where(eq(chargerTypes.code, code))
      .limit(1);
    const found = rows.at(0);
    if (!found) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Unknown charger type: ${code}`,
      });
    }
    return found.id;
  }

  private toResponse(row: ChargingSessionRow): ChargingSessionResponse {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      chargeDate: row.chargeDate,
      mileage: row.mileage,
      energyKwh: Number(row.energyKwh),
      pricePerKwh: Number(row.pricePerKwh),
      totalCost: Number(row.totalCost),
      chargerType: row.chargerType,
      socStartPercent: row.socStartPercent,
      socEndPercent: row.socEndPercent,
      stationName: row.stationName,
      isFullCharge: row.isFullCharge,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'NOT_FOUND',
      message: 'Charging session not found',
    });
  }
}
