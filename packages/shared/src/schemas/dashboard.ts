import { z } from 'zod';

import { EXPENSE_CATEGORY_CODES } from '../constants/expense-categories.js';

import { currencyCodeField, dateField, moneyField, timestampField, uuidField } from './_shared.js';

/**
 * Dashboard overview — user-scoped summary across all vehicles.
 */
export const DashboardOverviewSchema = z.object({
  totalVehicles: z.number().int().nonnegative(),
  totalExpenses: moneyField(12),
  totalFuelCost: moneyField(12),
  avgFuelConsumption: z.number().nonnegative().nullable(),
  currency: currencyCodeField(),
});

export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>;

/**
 * Expenses grouped by category (last 12 months).
 */
export const ExpenseByCategorySchema = z.object({
  category: z.enum(EXPENSE_CATEGORY_CODES),
  total: moneyField(12),
  count: z.number().int().nonnegative(),
});

export type ExpenseByCategory = z.infer<typeof ExpenseByCategorySchema>;

export const ExpensesByCategoryResponseSchema = z.object({
  items: z.array(ExpenseByCategorySchema),
  currency: currencyCodeField(),
});

export type ExpensesByCategoryResponse = z.infer<typeof ExpensesByCategoryResponseSchema>;

/**
 * Monthly spend series (last 12 months).
 */
export const MonthlySpendSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  total: moneyField(12),
  currency: currencyCodeField(),
});

export const MonthlySpendResponseSchema = z.array(MonthlySpendSchema);

export type MonthlySpend = z.infer<typeof MonthlySpendSchema>;

export type MonthlySpendResponse = z.infer<typeof MonthlySpendResponseSchema>;

/**
 * Upcoming reminder (due within 30 days).
 * Mirrors the fields from ReminderSchema but adds dueState.
 */
export const UpcomingReminderSchema = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  title: z.string().min(1).max(160),
  description: z.string().nullable(),
  dueDate: dateField().nullable(),
  dueMileage: z.number().int().nonnegative().nullable(),
  status: z.string(),
  dueState: z.enum(['overdue', 'due_soon']),
  createdAt: timestampField(),
  updatedAt: timestampField(),
});

export const UpcomingRemindersResponseSchema = z.array(UpcomingReminderSchema);

export type UpcomingReminder = z.infer<typeof UpcomingReminderSchema>;
