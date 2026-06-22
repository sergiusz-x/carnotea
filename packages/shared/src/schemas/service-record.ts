import { z } from 'zod';

import { dateField, mileageField, moneyField, timestampField, uuidField, positiveDecimalField } from './_shared.js';

/**
 * A part line attached to a service record, as sent in the request.
 * The server resolves or creates a `parts` catalog row by (manufacturer, partNumber),
 * then writes the `service_parts` join row with `totalPrice` computed server-side.
 */
export const ServicePartLineRequestSchema = z.object({
  name: z.string().min(1).max(160),
  manufacturer: z.string().max(120).nullish(),
  partNumber: z.string().max(80).nullish(),
  quantity: positiveDecimalField(10).default(1),
  unitPrice: moneyField(10),
});

/**
 * A part line in the response, enriched with the resolved `partId` and
 * server-computed `totalPrice`.
 */
export const ServicePartLineResponseSchema = z.object({
  id: uuidField(),
  serviceRecordId: uuidField(),
  partId: uuidField(),
  name: z.string().min(1).max(160),
  manufacturer: z.string().max(120).nullable(),
  partNumber: z.string().max(80).nullable(),
  quantity: positiveDecimalField(10),
  unitPrice: moneyField(10),
  totalPrice: moneyField(10),
});

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
  parts: z.array(ServicePartLineRequestSchema).max(50).optional(),
});

export const ServiceRecordUpdateSchema = serviceRecordCreateFields.partial();

export const ServiceRecordResponseSchema = serviceRecordFields.extend({
  parts: z.array(ServicePartLineResponseSchema).default([]),
});

export type ServiceRecord = z.infer<typeof ServiceRecordSchema>;
export type ServiceRecordCreate = z.infer<typeof ServiceRecordCreateSchema>;
export type ServiceRecordUpdate = z.infer<typeof ServiceRecordUpdateSchema>;
export type ServiceRecordResponse = z.infer<typeof ServiceRecordResponseSchema>;
export type ServicePartLineRequest = z.infer<typeof ServicePartLineRequestSchema>;
export type ServicePartLineResponse = z.infer<typeof ServicePartLineResponseSchema>;