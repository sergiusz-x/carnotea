import { z } from 'zod';

import { moneyField, timestampField, uuidField } from './_shared.js';

/**
 * Catalog part. Parts are global (not user-scoped); `(manufacturer, partNumber)`
 * is unique in the DB.
 */
const partFields = z.object({
  id: uuidField(),
  name: z.string().min(1).max(160),
  manufacturer: z.string().max(120).nullish(),
  partNumber: z.string().max(80).nullish(),
  defaultPrice: moneyField().default(0),
  createdAt: timestampField(),
});

export const PartSchema = partFields;

export const PartCreateSchema = partFields.omit({ id: true, createdAt: true });

export const PartUpdateSchema = PartCreateSchema.partial();

export type Part = z.infer<typeof PartSchema>;
export type PartCreate = z.infer<typeof PartCreateSchema>;
export type PartUpdate = z.infer<typeof PartUpdateSchema>;
