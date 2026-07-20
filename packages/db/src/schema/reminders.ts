import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { reminderStatuses } from './lookup-tables.js';
import { vehicles } from './vehicles.js';

export const reminders = pgTable(
  'reminders',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid()
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    title: varchar({ length: 160 }).notNull(),
    description: text(),
    mode: varchar({ length: 16 }).notNull().default('one_off'),
    dueDate: date(),
    dueMileage: integer(),
    intervalKm: integer(),
    intervalMonths: smallint(),
    lastPerformedDate: date(),
    lastPerformedMileage: integer(),
    statusId: smallint()
      .notNull()
      .references(() => reminderStatuses.id, { onDelete: 'restrict' }),
    notifiedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('reminders_mode_chk', sql`${t.mode} IN ('one_off', 'recurring')`),
    check('reminders_due_mileage_chk', sql`${t.dueMileage} IS NULL OR ${t.dueMileage} >= 0`),
    check('reminders_interval_km_chk', sql`${t.intervalKm} IS NULL OR ${t.intervalKm} > 0`),
    check(
      'reminders_interval_months_chk',
      sql`${t.intervalMonths} IS NULL OR ${t.intervalMonths} > 0`,
    ),
    check(
      'reminders_last_performed_mileage_chk',
      sql`${t.lastPerformedMileage} IS NULL OR ${t.lastPerformedMileage} >= 0`,
    ),
    check(
      'reminders_mode_fields_chk',
      sql`
        (
          ${t.mode} = 'one_off'
          AND (${t.dueDate} IS NOT NULL OR ${t.dueMileage} IS NOT NULL)
          AND ${t.intervalKm} IS NULL
          AND ${t.intervalMonths} IS NULL
          AND ${t.lastPerformedDate} IS NULL
          AND ${t.lastPerformedMileage} IS NULL
        )
        OR
        (
          ${t.mode} = 'recurring'
          AND (${t.intervalKm} IS NOT NULL OR ${t.intervalMonths} IS NOT NULL)
          AND (${t.intervalKm} IS NULL OR ${t.lastPerformedMileage} IS NOT NULL)
          AND (${t.intervalMonths} IS NULL OR ${t.lastPerformedDate} IS NOT NULL)
          AND ${t.dueDate} IS NULL
          AND ${t.dueMileage} IS NULL
        )
      `,
    ),
    index('idx_reminders_vehicle_id').on(t.vehicleId),
    index('idx_reminders_status_id').on(t.statusId),
    index('idx_reminders_status_due').on(t.statusId, t.dueDate),
  ],
);
