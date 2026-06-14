import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { vehicles } from './vehicles.js';

export const expenseCategories = pgTable('expense_categories', {
  id: uuid()
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: varchar({ length: 40 }).unique(),
  name: varchar({ length: 60 }).notNull().unique(),
});

export const expenses = pgTable(
  'expenses',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid()
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    categoryId: uuid()
      .notNull()
      .references(() => expenseCategories.id, { onDelete: 'restrict' }),
    expenseDate: date().notNull(),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    description: text(),
    sourceType: varchar({ length: 40 }).notNull().default('manual'),
    sourceId: uuid(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('expenses_amount_chk', sql`${t.amount} >= 0`),
    check(
      'expenses_source_type_chk',
      sql`${t.sourceType} IN ('fuel_log', 'service_record', 'manual', 'other', 'charging_session')`,
    ),
    index('idx_expenses_vehicle_id').on(t.vehicleId),
    index('idx_expenses_expense_date').on(t.expenseDate),
    index('idx_expenses_category_id').on(t.categoryId),
    uniqueIndex('idx_expenses_source_unique')
      .on(t.sourceType, t.sourceId)
      .where(sql`${t.sourceType} <> 'manual'`),
  ],
);
