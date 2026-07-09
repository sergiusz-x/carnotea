import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { fluidTypes } from './lookup-tables.js';
import { vehicles } from './vehicles.js';

export const fluidLogs = pgTable(
  'fluid_logs',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid()
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    fluidTypeId: smallint()
      .notNull()
      .references(() => fluidTypes.id, { onDelete: 'restrict' }),
    changeDate: date().notNull(),
    mileage: integer().notNull(),
    quantityLiters: numeric({ precision: 6, scale: 2 }),
    cost: numeric({ precision: 10, scale: 2 }),
    intervalKm: smallint(),
    intervalMonths: smallint(),
    workshopName: varchar({ length: 120 }),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('fluid_logs_mileage_chk', sql`${t.mileage} >= 0`),
    check(
      'fluid_logs_quantity_liters_chk',
      sql`${t.quantityLiters} IS NULL OR ${t.quantityLiters} > 0`,
    ),
    check('fluid_logs_cost_chk', sql`${t.cost} IS NULL OR ${t.cost} >= 0`),
    check('fluid_logs_interval_km_chk', sql`${t.intervalKm} IS NULL OR ${t.intervalKm} > 0`),
    check(
      'fluid_logs_interval_months_chk',
      sql`${t.intervalMonths} IS NULL OR ${t.intervalMonths} > 0`,
    ),
    index('idx_fluid_logs_vehicle_id').on(t.vehicleId),
    index('idx_fluid_logs_change_date').on(t.changeDate),
  ],
);
