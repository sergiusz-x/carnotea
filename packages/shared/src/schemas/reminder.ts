import { z } from 'zod';

import { REMINDER_STATUS_CODES } from '../constants/reminder-statuses.js';
import { type DueState } from '../helpers/due-state.js';

import { dateField, mileageField, timestampField, uuidField } from './_shared.js';

/**
 * Reminder. The DB stores `statusId` (FK to `reminder_statuses`); the contract
 * exposes the stable `status` code. The DB requires at least one trigger
 * (`dueDate` or `dueMileage`). `notifiedAt` is server-owned, so it is read-only.
 * A derived `dueState` is computed server-side.
 */
const reminderFields = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  title: z.string().min(1).max(160),
  description: z.string().nullish(),
  dueDate: dateField().nullish(),
  dueMileage: mileageField().nullish(),
  status: z.enum(REMINDER_STATUS_CODES),
  dueState: z.string(), // computed: 'overdue' | 'due_soon' | 'ok'
  notifiedAt: timestampField().nullish(),
  createdAt: timestampField(),
  updatedAt: timestampField(),
});

const hasTriggerRefine = (value: {
  dueDate?: string | null;
  dueMileage?: number | null;
}): boolean => value.dueDate != null || value.dueMileage != null;

const hasTriggerError = {
  message: 'A reminder needs at least one trigger: dueDate or dueMileage',
  path: ['dueDate'],
};

export const ReminderSchema = reminderFields.refine(hasTriggerRefine, hasTriggerError);

const reminderCreateFields = reminderFields.omit({
  id: true,
  vehicleId: true,
  dueState: true,
  notifiedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const ReminderCreateSchema = reminderCreateFields.refine(hasTriggerRefine, hasTriggerError);

// Update stays a plain partial: the trigger invariant is re-checked server-side
// against the merged row, since a partial body cannot see the persisted values.
export const ReminderUpdateSchema = reminderCreateFields.partial();

/** Query-string filter for `?status=` — accepts one or more comma-separated codes. */
export const ReminderStatusFilterSchema = z
  .string()
  .transform((val) => val.split(','))
  .pipe(z.array(z.enum(REMINDER_STATUS_CODES)).min(1))
  .optional();

export type Reminder = z.infer<typeof ReminderSchema>;
export type ReminderCreate = z.infer<typeof ReminderCreateSchema>;
export type ReminderUpdate = z.infer<typeof ReminderUpdateSchema>;
export type { DueState };
