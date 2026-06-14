import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { chargerTypes } from './lookup-tables.js';
import { vehicles } from './vehicles.js';

export const chargingSessions = pgTable(
  'charging_sessions',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid()
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    chargeDate: date().notNull(),
    mileage: integer().notNull(),
    energyKwh: numeric({ precision: 8, scale: 2 }).notNull(),
    pricePerKwh: numeric({ precision: 8, scale: 2 }).notNull(),
    totalCost: numeric({ precision: 10, scale: 2 }).notNull(),
    chargerTypeId: smallint()
      .notNull()
      .references(() => chargerTypes.id, { onDelete: 'restrict' }),
    socStartPercent: smallint(),
    socEndPercent: smallint(),
    stationName: varchar({ length: 120 }),
    isFullCharge: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('charging_sessions_mileage_chk', sql`${t.mileage} >= 0`),
    check('charging_sessions_energy_kwh_chk', sql`${t.energyKwh} > 0`),
    check('charging_sessions_price_per_kwh_chk', sql`${t.pricePerKwh} > 0`),
    check(
      'charging_sessions_total_cost_chk',
      sql`${t.totalCost} = round(${t.energyKwh} * ${t.pricePerKwh}, 2)`,
    ),
    check(
      'charging_sessions_soc_start_chk',
      sql`${t.socStartPercent} IS NULL OR ${t.socStartPercent} BETWEEN 0 AND 100`,
    ),
    check(
      'charging_sessions_soc_end_chk',
      sql`${t.socEndPercent} IS NULL OR ${t.socEndPercent} BETWEEN 0 AND 100`,
    ),
    check(
      'charging_sessions_soc_order_chk',
      sql`${t.socStartPercent} IS NULL OR ${t.socEndPercent} IS NULL OR ${t.socStartPercent} < ${t.socEndPercent}`,
    ),
    index('idx_charging_sessions_vehicle_id').on(t.vehicleId),
    index('idx_charging_sessions_charge_date').on(t.chargeDate),
  ],
);
