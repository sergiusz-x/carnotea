import { z } from 'zod';

import { dateField, mileageField, timestampField, uuidField } from './_shared.js';

/**
 * Odometer reading. `sourceType`/`sourceId` are server-owned: API-created
 * readings are always `manual`, while the other sources are written by the
 * mileage sync rule (T-021). They are therefore read-only in the contract.
 */
export const MILEAGE_SOURCE_TYPES = [
  'manual',
  'fuel_log',
  'service_record',
  'charging_session',
] as const;

const mileageReadingFields = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  readingDate: dateField(),
  mileage: mileageField(),
  sourceType: z.enum(MILEAGE_SOURCE_TYPES),
  sourceId: uuidField().nullish(),
  note: z.string().nullish(),
  createdAt: timestampField(),
  updatedAt: timestampField(),
});

export const MileageReadingSchema = mileageReadingFields;

export const MileageReadingCreateSchema = mileageReadingFields.omit({
  id: true,
  vehicleId: true,
  sourceType: true,
  sourceId: true,
  createdAt: true,
  updatedAt: true,
});

export const MileageReadingUpdateSchema = MileageReadingCreateSchema.partial();

export type MileageReading = z.infer<typeof MileageReadingSchema>;
export type MileageReadingCreate = z.infer<typeof MileageReadingCreateSchema>;
export type MileageReadingUpdate = z.infer<typeof MileageReadingUpdateSchema>;
