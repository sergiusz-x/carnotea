import { sql } from 'drizzle-orm';
import {
  check,
  index,
  numeric,
  pgTable,
  smallint,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { partIdentifierTypes } from './lookup-tables.js';

export const parts = pgTable(
  'parts',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar({ length: 160 }).notNull(),
    manufacturer: varchar({ length: 120 }),
    partNumber: varchar({ length: 80 }),
    defaultPrice: numeric({ precision: 10, scale: 2 }).notNull().default('0'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('parts_default_price_chk', sql`${t.defaultPrice} >= 0`),
    unique('parts_manufacturer_number_uq').on(t.manufacturer, t.partNumber),
  ],
);

export const partIdentifiers = pgTable(
  'part_identifiers',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    partId: uuid()
      .notNull()
      .references(() => parts.id, { onDelete: 'cascade' }),
    identifierTypeId: smallint()
      .notNull()
      .references(() => partIdentifierTypes.id, { onDelete: 'restrict' }),
    sourceName: varchar({ length: 120 }).notNull(),
    identifierValue: varchar({ length: 120 }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('part_identifiers_source_name_chk', sql`length(trim(${t.sourceName})) > 0`),
    check('part_identifiers_value_chk', sql`length(trim(${t.identifierValue})) > 0`),
    unique('part_identifiers_part_type_source_value_uq').on(
      t.partId,
      t.identifierTypeId,
      t.sourceName,
      t.identifierValue,
    ),
    index('idx_part_identifiers_part_id').on(t.partId),
    index('idx_part_identifiers_lookup').on(t.identifierTypeId, t.sourceName, t.identifierValue),
  ],
);
