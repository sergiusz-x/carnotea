import { expenseCategories, expenses } from '@carnotea/db';
import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { type DbTx } from '../mileage/mileage-sync.service.js';

export interface UpsertFromSourceParams {
  vehicleId: string;
  sourceType: 'fuel_log' | 'charging_session' | 'service_record';
  sourceId: string;
  amount: number;
  date: string;
  categoryCode: 'fuel' | 'electricity' | 'service';
}

export interface RemoveForSourceParams {
  sourceType: 'fuel_log' | 'charging_session' | 'service_record';
  sourceId: string;
}

@Injectable()
export class CostSyncService {
  async upsertFromSource(tx: DbTx, params: UpsertFromSourceParams): Promise<void> {
    const categoryCode = params.categoryCode;

    // Resolve categoryId from the code
    const catRows = await tx
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(eq(expenseCategories.code, categoryCode))
      .limit(1);

    const catRow = catRows.at(0);
    if (!catRow) {
      // If the category doesn't exist, fall back; this shouldn't happen with seeded data
      return;
    }

    await tx
      .insert(expenses)
      .values({
        vehicleId: params.vehicleId,
        categoryId: catRow.id,
        expenseDate: params.date,
        amount: String(params.amount),
        sourceType: params.sourceType,
        sourceId: params.sourceId,
      })
      .onConflictDoUpdate({
        target: [expenses.vehicleId, expenses.sourceType, expenses.sourceId],
        // idx_expenses_source_unique is a partial index (WHERE source_type <> 'manual'),
        // so PostgreSQL requires the same predicate here to match the conflict target.
        targetWhere: sql`${expenses.sourceType} <> 'manual'`,
        set: {
          amount: String(params.amount),
          expenseDate: params.date,
          categoryId: catRow.id,
        },
      });
  }

  async removeForSource(tx: DbTx, params: RemoveForSourceParams): Promise<void> {
    await tx
      .delete(expenses)
      .where(
        and(eq(expenses.sourceType, params.sourceType), eq(expenses.sourceId, params.sourceId)),
      );
  }
}
