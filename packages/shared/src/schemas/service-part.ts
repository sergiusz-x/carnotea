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
  quantity: positiveDecimalField(10),
  unitPrice: moneyField(10),
  totalPrice: moneyField(10),
});

export const ServicePartSchema = servicePartFields;

const servicePartCreateFields = servicePartFields.omit({
  id: true,
  serviceRecordId: true,
  totalPrice: true,
});

export const ServicePartCreateSchema = servicePartCreateFields.extend({
  quantity: positiveDecimalField(10).default(1),
});

export const ServicePartUpdateSchema = servicePartCreateFields.partial();

export type ServicePart = z.infer<typeof ServicePartSchema>;
export type ServicePartCreate = z.infer<typeof ServicePartCreateSchema>;
export type ServicePartUpdate = z.infer<typeof ServicePartUpdateSchema>;
