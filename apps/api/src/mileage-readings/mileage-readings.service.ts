import { mileageReadings, vehicles, type Db } from '@carnotea/db';
import { type MileageReadingCreate } from '@carnotea/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';
import { MileageSyncService, type DbTx } from '../mileage/mileage-sync.service.js';

export interface MileageReadingResponse {
  id: string;
  vehicleId: string;
  readingDate: string;
  mileage: number;
  sourceType: string;
  sourceId: string | null;
  note: string | null;
  createdAt: string;
}

interface MileageReadingRow {
  id: string;
  vehicleId: string;
  readingDate: string;
  mileage: number;
  sourceType: string;
  sourceId: string | null;
  note: string | null;
  createdAt: Date;
}

@Injectable()
export class MileageReadingsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly mileageSync: MileageSyncService,
  ) {}

  async list(userId: string, vehicleId: string): Promise<MileageReadingResponse[]> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select()
      .from(mileageReadings)
      .where(eq(mileageReadings.vehicleId, vehicleId))
      .orderBy(desc(mileageReadings.readingDate), desc(mileageReadings.id));

    return rows.map((row) => this.toResponse(row));
  }

  async getOwnedOrThrow(
    userId: string,
    vehicleId: string,
    id: string,
  ): Promise<MileageReadingResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select()
      .from(mileageReadings)
      .where(and(eq(mileageReadings.id, id), eq(mileageReadings.vehicleId, vehicleId)))
      .limit(1);

    const row = rows.at(0);
    if (!row) throw this.notFound();

    return this.toResponse(row);
  }

  async create(
    userId: string,
    vehicleId: string,
    input: MileageReadingCreate,
  ): Promise<MileageReadingResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    return this.db.transaction(async (tx: DbTx) => {
      const [row] = await tx
        .insert(mileageReadings)
        .values({
          vehicleId,
          readingDate: input.readingDate,
          mileage: input.mileage,
          sourceType: 'manual',
          sourceId: null,
          note: input.note ?? null,
        })
        .returning();

      if (!row) throw new Error('Mileage reading insert returned no row');

      await this.mileageSync.recomputeCurrentMileage(tx, vehicleId);

      return this.toResponse(row);
    });
  }

  async remove(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.assertVehicleOwned(userId, vehicleId);

    await this.db.transaction(async (tx: DbTx) => {
      const deleted = await tx
        .delete(mileageReadings)
        .where(and(eq(mileageReadings.id, id), eq(mileageReadings.vehicleId, vehicleId)))
        .returning({ id: mileageReadings.id });

      if (deleted.length === 0) throw this.notFound();

      await this.mileageSync.recomputeCurrentMileage(tx, vehicleId);
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

  private toResponse(row: MileageReadingRow): MileageReadingResponse {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      readingDate: row.readingDate,
      mileage: row.mileage,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Mileage reading not found' });
  }
}
