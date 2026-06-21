import { fuelLogs, vehicles, type Db } from '@carnotea/db';
import { type FuelLogCreate, type FuelLogUpdate } from '@carnotea/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, lt } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';
import { MileageSyncService } from '../mileage/mileage-sync.service.js';

export interface FuelLogResponse {
  id: string;
  vehicleId: string;
  fuelDate: string;
  mileage: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  stationName: string | null;
  isFullTank: boolean;
  consumptionHint: number | null;
  createdAt: string;
}

interface FuelLogRow {
  id: string;
  vehicleId: string;
  fuelDate: string;
  mileage: number;
  liters: string;
  pricePerLiter: string;
  totalCost: string;
  stationName: string | null;
  isFullTank: boolean;
  createdAt: Date;
}

export function computeTotalCost(liters: number, pricePerLiter: number): number {
  return Math.round(liters * pricePerLiter * 100) / 100;
}

export function computeConsumptionHint(
  currentLiters: number,
  currentMileage: number,
  currentIsFullTank: boolean,
  prevFullTankMileage: number | null,
): number | null {
  if (!currentIsFullTank || prevFullTankMileage === null) return null;
  const distance = currentMileage - prevFullTankMileage;
  if (distance <= 0) return null;
  return Math.round((currentLiters / distance) * 100 * 100) / 100;
}

@Injectable()
export class FuelLogsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly mileageSync: MileageSyncService,
  ) {}

  async list(userId: string, vehicleId: string): Promise<FuelLogResponse[]> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select()
      .from(fuelLogs)
      .where(eq(fuelLogs.vehicleId, vehicleId))
      .orderBy(desc(fuelLogs.fuelDate), desc(fuelLogs.mileage));

    const fullTankByMileage = rows
      .filter((r) => r.isFullTank)
      .sort((a, b) => a.mileage - b.mileage);

    return rows.map((row) => {
      const prevMileage = this.prevFullTankMileage(row.mileage, row.isFullTank, fullTankByMileage);
      return this.toResponse(row, prevMileage);
    });
  }

  async getOwnedOrThrow(userId: string, vehicleId: string, id: string): Promise<FuelLogResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select()
      .from(fuelLogs)
      .where(and(eq(fuelLogs.id, id), eq(fuelLogs.vehicleId, vehicleId)))
      .limit(1);

    const row = rows.at(0);
    if (!row) throw this.notFound();

    const prevMileage = await this.fetchPrevFullTankMileage(vehicleId, row.mileage, row.isFullTank);
    return this.toResponse(row, prevMileage);
  }

  async create(userId: string, vehicleId: string, input: FuelLogCreate): Promise<FuelLogResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const totalCost = computeTotalCost(input.liters, input.pricePerLiter);

    const inserted = await this.db
      .insert(fuelLogs)
      .values({
        vehicleId,
        fuelDate: input.fuelDate,
        mileage: input.mileage,
        liters: String(input.liters),
        pricePerLiter: String(input.pricePerLiter),
        totalCost: String(totalCost),
        stationName: input.stationName ?? null,
        isFullTank: input.isFullTank,
      })
      .returning({ id: fuelLogs.id });

    const created = inserted.at(0);
    if (!created) throw new Error('Fuel log insert returned no row');

    await this.mileageSync.syncDerivedReading({
      vehicleId,
      sourceType: 'fuel_log',
      sourceId: created.id,
      mileage: input.mileage,
      date: input.fuelDate,
    });

    return this.getOwnedOrThrow(userId, vehicleId, created.id);
  }

  async update(
    userId: string,
    vehicleId: string,
    id: string,
    input: FuelLogUpdate,
  ): Promise<FuelLogResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const current = await this.db
      .select()
      .from(fuelLogs)
      .where(and(eq(fuelLogs.id, id), eq(fuelLogs.vehicleId, vehicleId)))
      .limit(1);

    const existing = current.at(0);
    if (!existing) throw this.notFound();

    const newLiters = input.liters ?? Number(existing.liters);
    const newPricePerLiter = input.pricePerLiter ?? Number(existing.pricePerLiter);
    const newMileage = input.mileage ?? existing.mileage;
    const newFuelDate = input.fuelDate ?? existing.fuelDate;
    const totalCost = computeTotalCost(newLiters, newPricePerLiter);

    const updates: Partial<typeof fuelLogs.$inferInsert> = {};
    if (input.fuelDate !== undefined) updates.fuelDate = input.fuelDate;
    if (input.mileage !== undefined) updates.mileage = input.mileage;
    if (input.liters !== undefined) updates.liters = String(input.liters);
    if (input.pricePerLiter !== undefined) updates.pricePerLiter = String(input.pricePerLiter);
    if (input.stationName !== undefined) updates.stationName = input.stationName ?? null;
    if (input.isFullTank !== undefined) updates.isFullTank = input.isFullTank;
    updates.totalCost = String(totalCost);

    const affected = await this.db
      .update(fuelLogs)
      .set(updates)
      .where(and(eq(fuelLogs.id, id), eq(fuelLogs.vehicleId, vehicleId)))
      .returning({ id: fuelLogs.id });

    if (affected.length === 0) throw this.notFound();

    await this.mileageSync.syncDerivedReading({
      vehicleId,
      sourceType: 'fuel_log',
      sourceId: id,
      mileage: newMileage,
      date: newFuelDate,
    });

    return this.getOwnedOrThrow(userId, vehicleId, id);
  }

  async remove(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.assertVehicleOwned(userId, vehicleId);

    const deleted = await this.db
      .delete(fuelLogs)
      .where(and(eq(fuelLogs.id, id), eq(fuelLogs.vehicleId, vehicleId)))
      .returning({ id: fuelLogs.id });

    if (deleted.length === 0) throw this.notFound();

    await this.mileageSync.removeDerivedReading({
      vehicleId,
      sourceType: 'fuel_log',
      sourceId: id,
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

  private async fetchPrevFullTankMileage(
    vehicleId: string,
    currentMileage: number,
    currentIsFullTank: boolean,
  ): Promise<number | null> {
    if (!currentIsFullTank) return null;

    const rows = await this.db
      .select({ mileage: fuelLogs.mileage })
      .from(fuelLogs)
      .where(
        and(
          eq(fuelLogs.vehicleId, vehicleId),
          eq(fuelLogs.isFullTank, true),
          lt(fuelLogs.mileage, currentMileage),
        ),
      )
      .orderBy(desc(fuelLogs.mileage))
      .limit(1);

    return rows.at(0)?.mileage ?? null;
  }

  private prevFullTankMileage(
    currentMileage: number,
    currentIsFullTank: boolean,
    allFullTanksSortedByMileage: Array<{ mileage: number }>,
  ): number | null {
    if (!currentIsFullTank) return null;
    const prev = allFullTanksSortedByMileage.filter((r) => r.mileage < currentMileage).at(-1);
    return prev?.mileage ?? null;
  }

  private toResponse(row: FuelLogRow, prevFullTankMileage: number | null): FuelLogResponse {
    const liters = Number(row.liters);
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      fuelDate: row.fuelDate,
      mileage: row.mileage,
      liters,
      pricePerLiter: Number(row.pricePerLiter),
      totalCost: Number(row.totalCost),
      stationName: row.stationName,
      isFullTank: row.isFullTank,
      consumptionHint: computeConsumptionHint(
        liters,
        row.mileage,
        row.isFullTank,
        prevFullTankMileage,
      ),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Fuel log not found' });
  }
}
