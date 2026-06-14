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
    dueDate: date(),
    dueMileage: integer(),
    statusId: smallint()
      .notNull()
      .references(() => reminderStatuses.id, { onDelete: 'restrict' }),
    notifiedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('reminders_due_mileage_chk', sql`${t.dueMileage} IS NULL OR ${t.dueMileage} >= 0`),
    check('reminders_due_target_chk', sql`${t.dueDate} IS NOT NULL OR ${t.dueMileage} IS NOT NULL`),
    index('idx_reminders_vehicle_id').on(t.vehicleId),
    index('idx_reminders_status_id').on(t.statusId),
    index('idx_reminders_status_due').on(t.statusId, t.dueDate),
  ],
);
