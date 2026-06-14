import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { fuelTypes } from './lookup-tables.js';
import { users } from './users.js';

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brand: varchar({ length: 80 }).notNull(),
    model: varchar({ length: 80 }).notNull(),
    generation: varchar({ length: 80 }),
    productionYear: integer().notNull(),
    engine: varchar({ length: 80 }),
    fuelTypeId: smallint()
      .notNull()
      .references(() => fuelTypes.id, { onDelete: 'restrict' }),
    vin: varchar({ length: 17 }).unique(),
    registrationNumber: varchar({ length: 20 }).unique(),
    currentMileage: integer().notNull().default(0),
    currencyCode: varchar({ length: 3 }).notNull().default('EUR'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'vehicles_production_year_chk',
      sql`${t.productionYear} BETWEEN 1950 AND (EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1)`,
    ),
    check('vehicles_vin_length_chk', sql`${t.vin} IS NULL OR length(${t.vin}) = 17`),
    check('vehicles_current_mileage_chk', sql`${t.currentMileage} >= 0`),
    check('vehicles_currency_code_chk', sql`char_length(${t.currencyCode}) = 3`),
    index('idx_vehicles_user_id').on(t.userId),
  ],
);
