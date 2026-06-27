import {
  ChargingSessionSchema,
  ExpenseSchema,
  FuelLogSchema,
  IssueSchema,
  MileageReadingSchema,
  ReminderSchema,
  ServiceRecordResponseSchema,
  UserProfileSchema,
  VehicleSchema,
} from '@carnotea/shared';
import { z } from 'zod';

/**
 * Top-level shape of the GDPR data-export JSON.
 * Composed from canonical per-resource Zod schemas (no parallel types).
 * Excludes secrets (passwords, session tokens).
 */
export const AccountExportSchema = z.object({
  exportedAt: z.string(),
  version: z.literal(1),
  profile: UserProfileSchema,
  vehicles: z.array(VehicleSchema),
  fuelLogs: z.array(FuelLogSchema),
  chargingSessions: z.array(ChargingSessionSchema),
  mileageReadings: z.array(MileageReadingSchema),
  serviceRecords: z.array(ServiceRecordResponseSchema),
  issues: z.array(IssueSchema),
  expenses: z.array(ExpenseSchema),
  reminders: z.array(ReminderSchema),
});

export type AccountExport = z.infer<typeof AccountExportSchema>;

/**
 * Body for DELETE /api/me.
 * The user must type their email address to confirm irreversible deletion.
 */
export const DeleteAccountBodySchema = z.object({
  confirmation: z.string().min(1),
});

export type DeleteAccountBody = z.infer<typeof DeleteAccountBodySchema>;
