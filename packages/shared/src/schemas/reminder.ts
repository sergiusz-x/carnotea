import { z } from 'zod';

import { REMINDER_STATUS_CODES } from '../constants/reminder-statuses.js';
import { REMINDER_MODES, type DueState, type ReminderMode } from '../helpers/due-state.js';

import { dateField, mileageField, timestampField, uuidField } from './_shared.js';

const ReminderModeSchema = z.enum(REMINDER_MODES);
const DueStateSchema = z.enum(['overdue', 'due_soon', 'ok']);

const reminderFields = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  title: z.string().min(1).max(160),
  description: z.string().nullish(),
  mode: ReminderModeSchema,
  dueDate: dateField().nullish(),
  dueMileage: mileageField().nullish(),
  intervalKm: z.number().int().positive().nullish(),
  intervalMonths: z.number().int().positive().nullish(),
  lastPerformedDate: dateField().nullish(),
  lastPerformedMileage: mileageField().nullish(),
  nextDueDate: dateField().nullish(),
  nextDueMileage: mileageField().nullish(),
  status: z.enum(REMINDER_STATUS_CODES),
  dueState: DueStateSchema,
  notifiedAt: timestampField().nullish(),
  createdAt: timestampField(),
  updatedAt: timestampField(),
});

type ReminderShape = {
  mode?: ReminderMode;
  dueDate?: string | null;
  dueMileage?: number | null;
  intervalKm?: number | null;
  intervalMonths?: number | null;
  lastPerformedDate?: string | null;
  lastPerformedMileage?: number | null;
  nextDueDate?: string | null;
  nextDueMileage?: number | null;
};

function validateReminderShape(
  value: ReminderShape,
  ctx: z.RefinementCtx,
  requireComputedTargets: boolean,
): void {
  const mode = value.mode ?? 'one_off';

  if (mode === 'one_off') {
    if (value.dueDate == null && value.dueMileage == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'A one-off reminder needs at least one trigger: dueDate or dueMileage',
      });
    }
    return;
  }

  if (value.intervalKm == null && value.intervalMonths == null) {
    ctx.addIssue({
      code: 'custom',
      path: ['intervalKm'],
      message: 'A recurring reminder needs at least one interval: intervalKm or intervalMonths',
    });
  }

  if (value.intervalKm != null && value.lastPerformedMileage == null) {
    ctx.addIssue({
      code: 'custom',
      path: ['lastPerformedMileage'],
      message: 'Recurring mileage intervals require lastPerformedMileage',
    });
  }

  if (value.intervalMonths != null && value.lastPerformedDate == null) {
    ctx.addIssue({
      code: 'custom',
      path: ['lastPerformedDate'],
      message: 'Recurring month intervals require lastPerformedDate',
    });
  }

  if (requireComputedTargets && value.nextDueDate == null && value.nextDueMileage == null) {
    ctx.addIssue({
      code: 'custom',
      path: ['nextDueDate'],
      message: 'A recurring reminder needs at least one computed next due target',
    });
  }
}

export const ReminderSchema = reminderFields.superRefine((value, ctx) => {
  validateReminderShape(value, ctx, true);
});

const reminderCreateFields = reminderFields
  .omit({
    id: true,
    vehicleId: true,
    nextDueDate: true,
    nextDueMileage: true,
    dueState: true,
    notifiedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    mode: ReminderModeSchema.default('one_off'),
  });

export const ReminderCreateSchema = reminderCreateFields.superRefine((value, ctx) => {
  validateReminderShape(value, ctx, false);
});

export const ReminderUpdateSchema = reminderCreateFields.partial();

export const ReminderStatusFilterSchema = z
  .string()
  .transform((val) => val.split(','))
  .pipe(z.array(z.enum(REMINDER_STATUS_CODES)).min(1))
  .optional();

export type Reminder = z.infer<typeof ReminderSchema>;
export type ReminderCreate = z.infer<typeof ReminderCreateSchema>;
export type ReminderUpdate = z.infer<typeof ReminderUpdateSchema>;
export type { DueState, ReminderMode };
