import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { vehicles } from './vehicles.js';

export const mileageReadings = pgTable(
  'mileage_readings',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid()
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    readingDate: date().notNull(),
    mileage: integer().notNull(),
    sourceType: varchar({ length: 40 }).notNull().default('manual'),
    sourceId: uuid(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('mileage_readings_mileage_chk', sql`${t.mileage} >= 0`),
    check(
      'mileage_readings_source_type_chk',
      sql`${t.sourceType} IN ('manual', 'fuel_log', 'service_record', 'charging_session')`,
    ),
    check(
      'mileage_readings_source_id_chk',
      sql`(${t.sourceType} = 'manual' AND ${t.sourceId} IS NULL) OR (${t.sourceType} <> 'manual' AND ${t.sourceId} IS NOT NULL)`,
    ),
    index('idx_mileage_readings_vehicle_id').on(t.vehicleId),
    index('idx_mileage_readings_vehicle_date').on(t.vehicleId, t.readingDate, t.id),
    uniqueIndex('idx_mileage_readings_source_unique')
      .on(t.vehicleId, t.sourceType, t.sourceId)
      .where(sql`${t.sourceType} <> 'manual'`),
  ],
);
