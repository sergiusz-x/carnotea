import { z } from 'zod';

import { CHARGER_TYPE_CODES } from '../constants/charger-types.js';
import { EXPENSE_CATEGORY_CODES } from '../constants/expense-categories.js';
import { FLUID_TYPE_CODES } from '../constants/fluid-types.js';
import { ISSUE_PRIORITY_CODES } from '../constants/issue-priorities.js';
import { ISSUE_STATUS_CODES } from '../constants/issue-statuses.js';
import { REMINDER_STATUS_CODES } from '../constants/reminder-statuses.js';

import {
  dateField,
  mileageField,
  moneyField,
  positiveDecimalField,
  socPercentField,
  uuidField,
} from './_shared.js';

/**
 * The unified activity feed (`Dziennik`) — one chronological stream of every
 * event for a vehicle. `ActivityEntry` is a discriminated union on `kind` so the
 * web renders and **translates** each variant itself; no human-readable strings
 * are baked into the API (i18n is web-side — ADR-0007). Each variant reuses the
 * fields its source resource already exposes. See
 * `docs/redesign/cockpit-logbook-plan.md` §4a.
 */
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

/** Fields present on every entry regardless of kind. */
const activityBase = {
  id: uuidField(),
  vehicleId: uuidField(),
  /** The event's own date (fuelDate, chargeDate, serviceDate, …). */
  occurredAt: dateField(),
  /** Odometer at the event, when the source records it. */
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
  status: z.enum(REMINDER_STATUS_CODES),
  dueState: z.enum(['overdue', 'due_soon', 'ok']),
  dueDate: dateField().nullable(),
  dueMileage: mileageField().nullable(),
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

/** One page of the feed. `nextCursor` is an opaque keyset cursor, null at the end. */
export const ActivityFeedResponseSchema = z.object({
  items: z.array(ActivityEntrySchema),
  nextCursor: z.string().nullable(),
});

export type ActivityFeedResponse = z.infer<typeof ActivityFeedResponseSchema>;

/** Query params for `GET /api/vehicles/{vehicleId}/activity`. */
export const ActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

export type ActivityQuery = z.infer<typeof ActivityQuerySchema>;
