import { mileageReadings, vehicles, type Db } from '@carnotea/db';
import { Injectable } from '@nestjs/common';
import { and, eq, max, sql } from 'drizzle-orm';

export type DbTx = Parameters<Parameters<Db['transaction']>[0]>[0];

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
  async syncDerivedReading(tx: DbTx, params: SyncDerivedReadingParams): Promise<void> {
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

    await this.recomputeCurrentMileage(tx, params.vehicleId);
  }

  async removeDerivedReading(tx: DbTx, params: RemoveDerivedReadingParams): Promise<void> {
    await tx
      .delete(mileageReadings)
      .where(
        and(
          eq(mileageReadings.vehicleId, params.vehicleId),
          eq(mileageReadings.sourceType, params.sourceType),
          eq(mileageReadings.sourceId, params.sourceId),
        ),
      );

    await this.recomputeCurrentMileage(tx, params.vehicleId);
  }

  async recomputeCurrentMileage(tx: DbTx, vehicleId: string): Promise<void> {
    const agg = await tx
      .select({ maxMileage: max(mileageReadings.mileage) })
      .from(mileageReadings)
      .where(eq(mileageReadings.vehicleId, vehicleId));

    await tx
      .update(vehicles)
      .set({ currentMileage: agg.at(0)?.maxMileage ?? 0, updatedAt: new Date() })
      .where(eq(vehicles.id, vehicleId));
  }
}
