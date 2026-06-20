import { mileageReadings, vehicles, type Db } from '@carnotea/db';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, max, sql } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';

export interface SyncDerivedReadingParams {
  vehicleId: string;
  sourceType: 'fuel_log' | 'charging_session' | 'service_record';
  sourceId: string;
  mileage: number;
  date: string;
}

export interface RemoveDerivedReadingParams {
  vehicleId: string;
  sourceType: 'fuel_log' | 'charging_session' | 'service_record';
  sourceId: string;
}

@Injectable()
export class MileageSyncService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async syncDerivedReading(params: SyncDerivedReadingParams): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(mileageReadings)
        .values({
          vehicleId: params.vehicleId,
          readingDate: params.date,
          mileage: params.mileage,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
        })
        .onConflictDoUpdate({
          target: [mileageReadings.vehicleId, mileageReadings.sourceType, mileageReadings.sourceId],
          targetWhere: sql`${mileageReadings.sourceType} <> 'manual'`,
          set: {
            mileage: params.mileage,
            readingDate: params.date,
            updatedAt: new Date(),
          },
        });

      const agg = await tx
        .select({ maxMileage: max(mileageReadings.mileage) })
        .from(mileageReadings)
        .where(eq(mileageReadings.vehicleId, params.vehicleId));

      await tx
        .update(vehicles)
        .set({ currentMileage: agg.at(0)?.maxMileage ?? 0, updatedAt: new Date() })
        .where(eq(vehicles.id, params.vehicleId));
    });
  }

  async removeDerivedReading(params: RemoveDerivedReadingParams): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(mileageReadings)
        .where(
          and(
            eq(mileageReadings.vehicleId, params.vehicleId),
            eq(mileageReadings.sourceType, params.sourceType),
            eq(mileageReadings.sourceId, params.sourceId),
          ),
        );

      const agg = await tx
        .select({ maxMileage: max(mileageReadings.mileage) })
        .from(mileageReadings)
        .where(eq(mileageReadings.vehicleId, params.vehicleId));

      await tx
        .update(vehicles)
        .set({ currentMileage: agg.at(0)?.maxMileage ?? 0, updatedAt: new Date() })
        .where(eq(vehicles.id, params.vehicleId));
    });
  }

  async recomputeCurrentMileage(vehicleId: string): Promise<void> {
    const agg = await this.db
      .select({ maxMileage: max(mileageReadings.mileage) })
      .from(mileageReadings)
      .where(eq(mileageReadings.vehicleId, vehicleId));

    await this.db
      .update(vehicles)
      .set({ currentMileage: agg.at(0)?.maxMileage ?? 0, updatedAt: new Date() })
      .where(eq(vehicles.id, vehicleId));
  }
}
