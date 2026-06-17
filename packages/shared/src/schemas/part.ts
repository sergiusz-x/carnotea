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
  defaultPrice: moneyField(10),
  createdAt: timestampField(),
});

export const PartSchema = partFields;

const partCreateFields = partFields.omit({ id: true, createdAt: true });

export const PartCreateSchema = partCreateFields.extend({
  defaultPrice: moneyField(10).default(0),
});

export const PartUpdateSchema = partCreateFields.partial();

export type Part = z.infer<typeof PartSchema>;
export type PartCreate = z.infer<typeof PartCreateSchema>;
export type PartUpdate = z.infer<typeof PartUpdateSchema>;
