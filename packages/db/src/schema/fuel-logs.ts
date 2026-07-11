import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { vehicles } from './vehicles.js';

export const fuelLogs = pgTable(
  'fuel_logs',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid()
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    fuelDate: date().notNull(),
    mileage: integer().notNull(),
    liters: numeric({ precision: 8, scale: 2 }).notNull(),
    pricePerLiter: numeric({ precision: 8, scale: 2 }).notNull(),
    totalCost: numeric({ precision: 10, scale: 2 }).notNull(),
    stationName: varchar({ length: 120 }),
    description: text(),
    isFullTank: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('fuel_logs_mileage_chk', sql`${t.mileage} >= 0`),
    check('fuel_logs_liters_chk', sql`${t.liters} > 0`),
    check('fuel_logs_price_per_liter_chk', sql`${t.pricePerLiter} > 0`),
    check(
      'fuel_logs_total_cost_chk',
      sql`${t.totalCost} = round(${t.liters} * ${t.pricePerLiter}, 2)`,
    ),
    index('idx_fuel_logs_vehicle_id').on(t.vehicleId),
    index('idx_fuel_logs_fuel_date').on(t.fuelDate),
  ],
);
