import { sql } from 'drizzle-orm';
import {
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

export const serviceRecords = pgTable(
  'service_records',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid()
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    serviceDate: date().notNull(),
    mileage: integer().notNull(),
    title: varchar({ length: 160 }).notNull(),
    description: text(),
    laborCost: numeric({ precision: 10, scale: 2 }).notNull().default('0'),
    totalCost: numeric({ precision: 10, scale: 2 }).notNull().default('0'),
    workshopName: varchar({ length: 160 }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('service_records_mileage_chk', sql`${t.mileage} >= 0`),
    check('service_records_labor_cost_chk', sql`${t.laborCost} >= 0`),
    check('service_records_total_cost_chk', sql`${t.totalCost} >= ${t.laborCost}`),
    index('idx_service_records_vehicle_id').on(t.vehicleId),
    index('idx_service_records_service_date').on(t.serviceDate),
  ],
);
