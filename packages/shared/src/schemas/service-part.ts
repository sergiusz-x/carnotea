import { z } from 'zod';

import { moneyField, positiveDecimalField, uuidField } from './_shared.js';

/**
 * A part attached to a service record. `totalPrice` is DB-computed
 * (`round(quantity * unitPrice, 2)`) and read-only. `serviceRecordId` comes from
 * the route, not the body.
 */
const servicePartFields = z.object({
  id: uuidField(),
  serviceRecordId: uuidField(),
  partId: uuidField(),
  quantity: positiveDecimalField().default(1),
  unitPrice: moneyField(),
  totalPrice: moneyField(),
});

export const ServicePartSchema = servicePartFields;

export const ServicePartCreateSchema = servicePartFields.omit({
  id: true,
  serviceRecordId: true,
  totalPrice: true,
});

export const ServicePartUpdateSchema = ServicePartCreateSchema.partial();

export type ServicePart = z.infer<typeof ServicePartSchema>;
export type ServicePartCreate = z.infer<typeof ServicePartCreateSchema>;
export type ServicePartUpdate = z.infer<typeof ServicePartUpdateSchema>;
