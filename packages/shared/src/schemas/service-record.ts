import { z } from 'zod';

import { dateField, mileageField, moneyField, timestampField, uuidField } from './_shared.js';

/**
 * Service / maintenance record. `totalCost` is server-maintained
 * (`laborCost` + linked parts, DB-constrained to `>= laborCost`), so it is
 * read-only in the contract.
 */
const serviceRecordFields = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  serviceDate: dateField(),
  mileage: mileageField(),
  title: z.string().min(1).max(160),
  description: z.string().nullish(),
  laborCost: moneyField(10),
  totalCost: moneyField(10),
  workshopName: z.string().max(160).nullish(),
  createdAt: timestampField(),
  updatedAt: timestampField(),
});

export const ServiceRecordSchema = serviceRecordFields;

const serviceRecordCreateFields = serviceRecordFields.omit({
  id: true,
  vehicleId: true,
  totalCost: true,
  createdAt: true,
  updatedAt: true,
});

export const ServiceRecordCreateSchema = serviceRecordCreateFields.extend({
  laborCost: moneyField(10).default(0),
});

export const ServiceRecordUpdateSchema = serviceRecordCreateFields.partial();

export type ServiceRecord = z.infer<typeof ServiceRecordSchema>;
export type ServiceRecordCreate = z.infer<typeof ServiceRecordCreateSchema>;
export type ServiceRecordUpdate = z.infer<typeof ServiceRecordUpdateSchema>;
