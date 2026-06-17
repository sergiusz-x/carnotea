import { z } from 'zod';

import { EXPENSE_CATEGORY_CODES } from '../constants/expense-categories.js';

import { dateField, moneyField, timestampField, uuidField } from './_shared.js';

/**
 * Expense. The DB stores `categoryId` (FK to `expense_categories`); the contract
 * exposes the stable `category` code. `sourceType`/`sourceId` are server-owned:
 * API-created expenses are `manual`, the rest are written by the cost-sync rule
 * (T-026), so they are read-only here.
 */
export const EXPENSE_SOURCE_TYPES = [
  'manual',
  'other',
  'fuel_log',
  'service_record',
  'charging_session',
] as const;

const expenseFields = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  category: z.enum(EXPENSE_CATEGORY_CODES),
  expenseDate: dateField(),
  amount: moneyField(10),
  description: z.string().nullish(),
  sourceType: z.enum(EXPENSE_SOURCE_TYPES),
  sourceId: uuidField().nullish(),
  createdAt: timestampField(),
});

export const ExpenseSchema = expenseFields;

export const ExpenseCreateSchema = expenseFields.omit({
  id: true,
  vehicleId: true,
  sourceType: true,
  sourceId: true,
  createdAt: true,
});

export const ExpenseUpdateSchema = ExpenseCreateSchema.partial();

export type Expense = z.infer<typeof ExpenseSchema>;
export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof ExpenseUpdateSchema>;
