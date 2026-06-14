import { sql } from 'drizzle-orm';
import { check, index, numeric, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

import { parts } from './parts.js';
import { serviceRecords } from './service-records.js';

export const serviceParts = pgTable(
  'service_parts',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    serviceRecordId: uuid()
      .notNull()
      .references(() => serviceRecords.id, { onDelete: 'cascade' }),
    partId: uuid()
      .notNull()
      .references(() => parts.id, { onDelete: 'restrict' }),
    quantity: numeric({ precision: 10, scale: 2 }).notNull().default('1'),
    unitPrice: numeric({ precision: 10, scale: 2 }).notNull(),
    totalPrice: numeric({ precision: 10, scale: 2 }).notNull(),
  },
  (t) => [
    check('service_parts_quantity_chk', sql`${t.quantity} > 0`),
    check('service_parts_unit_price_chk', sql`${t.unitPrice} >= 0`),
    check(
      'service_parts_total_price_chk',
      sql`${t.totalPrice} = round(${t.quantity} * ${t.unitPrice}, 2)`,
    ),
    unique('service_parts_record_part_uq').on(t.serviceRecordId, t.partId),
    index('idx_service_parts_service_record_id').on(t.serviceRecordId),
    index('idx_service_parts_part_id').on(t.partId),
  ],
);
