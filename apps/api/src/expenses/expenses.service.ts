import { expenseCategories, expenses, vehicles, type Db } from '@carnotea/db';
import { type ExpenseCreate, type ExpenseUpdate } from '@carnotea/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';

export interface ExpenseResponse {
  id: string;
  vehicleId: string;
  category: string;
  expenseDate: string;
  amount: number;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  isAutoSynced: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseJoinRow {
  id: string;
  vehicleId: string;
  categoryCode: string;
  expenseDate: string;
  amount: string;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ExpensesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(userId: string, vehicleId: string, source?: string): Promise<ExpenseResponse[]> {
    await this.assertVehicleOwned(userId, vehicleId);

    const conditions = [eq(expenses.vehicleId, vehicleId)];
    if (source) {
      conditions.push(eq(expenses.sourceType, source));
    }

    const rows = await this.db
      .select({
        id: expenses.id,
        vehicleId: expenses.vehicleId,
        categoryCode: expenseCategories.code,
        expenseDate: expenses.expenseDate,
        amount: expenses.amount,
        description: expenses.description,
        sourceType: expenses.sourceType,
        sourceId: expenses.sourceId,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(and(...conditions))
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));

    return rows.map((row) =>
      this.toResponse({ ...row, updatedAt: new Date() } as unknown as ExpenseJoinRow),
    );
  }

  async getOwnedOrThrow(userId: string, vehicleId: string, id: string): Promise<ExpenseResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select({
        id: expenses.id,
        vehicleId: expenses.vehicleId,
        categoryCode: expenseCategories.code,
        expenseDate: expenses.expenseDate,
        amount: expenses.amount,
        description: expenses.description,
        sourceType: expenses.sourceType,
        sourceId: expenses.sourceId,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(and(eq(expenses.id, id), eq(expenses.vehicleId, vehicleId)))
      .limit(1);

    const row = rows.at(0);
    if (!row) throw this.notFound();

    return this.toResponse({ ...row, updatedAt: new Date() } as unknown as ExpenseJoinRow);
  }

  async create(userId: string, vehicleId: string, input: ExpenseCreate): Promise<ExpenseResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const categoryId = await this.resolveCategoryId(input.category);

    const inserted = await this.db
      .insert(expenses)
      .values({
        vehicleId,
        categoryId,
        expenseDate: input.expenseDate,
        amount: String(input.amount),
        description: input.description ?? null,
        sourceType: 'manual',
      })
      .returning({ id: expenses.id });

    const created = inserted.at(0);
    if (!created) throw new Error('Expense insert returned no row');

    return this.getOwnedOrThrow(userId, vehicleId, created.id);
  }

  async update(
    userId: string,
    vehicleId: string,
    id: string,
    input: ExpenseUpdate,
  ): Promise<ExpenseResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const current = await this.db
      .select({
        id: expenses.id,
        sourceType: expenses.sourceType,
        categoryId: expenses.categoryId,
        expenseDate: expenses.expenseDate,
        amount: expenses.amount,
        description: expenses.description,
      })
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.vehicleId, vehicleId)))
      .limit(1);

    const existing = current.at(0);
    if (!existing) throw this.notFound();

    // Auto-synced rows are read-only
    if (existing.sourceType !== 'manual') {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Cannot edit an auto-synced expense. Edit the source entry instead.',
      });
    }

    const updates: Record<string, unknown> = {};
    if (input.category !== undefined) {
      updates.categoryId = await this.resolveCategoryId(input.category);
    }
    if (input.expenseDate !== undefined) updates.expenseDate = input.expenseDate;
    if (input.amount !== undefined) updates.amount = String(input.amount);
    if (input.description !== undefined) updates.description = input.description ?? null;

    const affected = await this.db
      .update(expenses)
      .set(updates as Partial<typeof expenses.$inferInsert>)
      .where(and(eq(expenses.id, id), eq(expenses.vehicleId, vehicleId)))
      .returning({ id: expenses.id });

    if (affected.length === 0) throw this.notFound();

    return this.getOwnedOrThrow(userId, vehicleId, id);
  }

  async remove(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.assertVehicleOwned(userId, vehicleId);

    const current = await this.db
      .select({ id: expenses.id, sourceType: expenses.sourceType })
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.vehicleId, vehicleId)))
      .limit(1);

    const existing = current.at(0);
    if (!existing) throw this.notFound();

    // Auto-synced rows are read-only
    if (existing.sourceType !== 'manual') {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Cannot delete an auto-synced expense. Delete the source entry instead.',
      });
    }

    const deleted = await this.db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.vehicleId, vehicleId)))
      .returning({ id: expenses.id });

    if (deleted.length === 0) throw this.notFound();
  }

  private async resolveCategoryId(code: string): Promise<string> {
    const rows = await this.db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(eq(expenseCategories.code, code))
      .limit(1);

    const found = rows.at(0);
    if (!found) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Unknown expense category: ${code}`,
      });
    }
    return found.id;
  }

  private async assertVehicleOwned(userId: string, vehicleId: string): Promise<void> {
    const rows = await this.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);

    if (!rows.at(0)) throw this.notFound();
  }

  private toResponse(row: ExpenseJoinRow): ExpenseResponse {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      category: row.categoryCode,
      expenseDate: row.expenseDate,
      amount: Number(row.amount),
      description: row.description,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      isAutoSynced: row.sourceType !== 'manual',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Expense not found' });
  }
}
