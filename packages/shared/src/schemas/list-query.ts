import { z } from 'zod';

import { dateField } from './_shared.js';

/**
 * Reusable query schema for list endpoints: pagination, sort, and a date-range
 * filter. Query-string values arrive as strings, so numeric fields are coerced.
 * Feature tickets extend this (e.g. `.extend({ sortBy: z.enum([...]) })`) rather
 * than re-declaring pagination each time.
 */
export const ListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().min(1).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    dateFrom: dateField().optional(),
    dateTo: dateField().optional(),
  })
  .refine((q) => q.dateFrom === undefined || q.dateTo === undefined || q.dateFrom <= q.dateTo, {
    message: 'dateFrom must be on or before dateTo',
    path: ['dateFrom'],
  });

export type ListQuery = z.infer<typeof ListQuerySchema>;
