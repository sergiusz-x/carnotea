import { z } from 'zod';

import { CHARGER_TYPE_CODES } from '../constants/charger-types.js';
import { EXPENSE_CATEGORY_CODES } from '../constants/expense-categories.js';
import { FLUID_TYPE_CODES } from '../constants/fluid-types.js';
import { ISSUE_PRIORITY_CODES } from '../constants/issue-priorities.js';
import { ISSUE_STATUS_CODES } from '../constants/issue-statuses.js';
import { REMINDER_STATUS_CODES } from '../constants/reminder-statuses.js';
import { REMINDER_MODES } from '../helpers/due-state.js';

import {
  dateField,
  mileageField,
  moneyField,
  positiveDecimalField,
  socPercentField,
  uuidField,
} from './_shared.js';

export const ACTIVITY_KINDS = [
  'fuel',
  'charge',
  'fluid',
  'service',
  'expense',
  'issue',
  'reminder',
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

const activityBase = {
  id: uuidField(),
  vehicleId: uuidField(),
  occurredAt: dateField(),
  mileage: mileageField().nullable(),
};

export const FuelActivitySchema = z.object({
  ...activityBase,
  kind: z.literal('fuel'),
  liters: positiveDecimalField(),
  totalCost: moneyField(),
  isFullTank: z.boolean(),
  stationName: z.string().nullable(),
});

export const ChargeActivitySchema = z.object({
  ...activityBase,
  kind: z.literal('charge'),
  energyKwh: positiveDecimalField(),
  totalCost: moneyField(),
  chargerType: z.enum(CHARGER_TYPE_CODES),
  isFullCharge: z.boolean(),
  stationName: z.string().nullable(),
  socStartPercent: socPercentField().nullable(),
  socEndPercent: socPercentField().nullable(),
});

export const FluidActivitySchema = z.object({
  ...activityBase,
  kind: z.literal('fluid'),
  fluidType: z.enum(FLUID_TYPE_CODES),
  quantityLiters: positiveDecimalField().nullable(),
  cost: moneyField().nullable(),
  workshopName: z.string().nullable(),
});

export const ServiceActivitySchema = z.object({
  ...activityBase,
  kind: z.literal('service'),
  title: z.string(),
  totalCost: moneyField(),
  workshopName: z.string().nullable(),
  partCount: z.number().int().nonnegative(),
});

export const ExpenseActivitySchema = z.object({
  ...activityBase,
  kind: z.literal('expense'),
  category: z.enum(EXPENSE_CATEGORY_CODES),
  amount: moneyField(),
  description: z.string().nullable(),
  isAutoSynced: z.boolean(),
});

export const IssueActivitySchema = z.object({
  ...activityBase,
  kind: z.literal('issue'),
  title: z.string(),
  status: z.enum(ISSUE_STATUS_CODES),
  priority: z.enum(ISSUE_PRIORITY_CODES),
});

export const ReminderActivitySchema = z.object({
  ...activityBase,
  kind: z.literal('reminder'),
  title: z.string(),
  mode: z.enum(REMINDER_MODES),
  status: z.enum(REMINDER_STATUS_CODES),
  dueState: z.enum(['overdue', 'due_soon', 'ok']),
  dueDate: dateField().nullable(),
  dueMileage: mileageField().nullable(),
  intervalKm: z.number().int().positive().nullable(),
  intervalMonths: z.number().int().positive().nullable(),
  lastPerformedDate: dateField().nullable(),
  lastPerformedMileage: mileageField().nullable(),
  nextDueDate: dateField().nullable(),
  nextDueMileage: mileageField().nullable(),
});

export const ActivityEntrySchema = z.discriminatedUnion('kind', [
  FuelActivitySchema,
  ChargeActivitySchema,
  FluidActivitySchema,
  ServiceActivitySchema,
  ExpenseActivitySchema,
  IssueActivitySchema,
  ReminderActivitySchema,
]);

export type ActivityEntry = z.infer<typeof ActivityEntrySchema>;

export const ActivityFeedResponseSchema = z.object({
  items: z.array(ActivityEntrySchema),
  nextCursor: z.string().nullable(),
});

export type ActivityFeedResponse = z.infer<typeof ActivityFeedResponseSchema>;

export const ActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

export type ActivityQuery = z.infer<typeof ActivityQuerySchema>;
