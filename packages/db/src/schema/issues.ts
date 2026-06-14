import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { issuePriorities, issueStatuses } from './lookup-tables.js';
import { serviceRecords } from './service-records.js';
import { vehicles } from './vehicles.js';

export const issues = pgTable(
  'issues',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vehicleId: uuid()
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    reportedDate: date().notNull(),
    resolvedDate: date(),
    title: varchar({ length: 160 }).notNull(),
    description: text(),
    statusId: smallint()
      .notNull()
      .references(() => issueStatuses.id, { onDelete: 'restrict' }),
    priorityId: smallint()
      .notNull()
      .references(() => issuePriorities.id, { onDelete: 'restrict' }),
    relatedServiceRecordId: uuid().references(() => serviceRecords.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'issues_resolved_date_chk',
      sql`${t.resolvedDate} IS NULL OR ${t.resolvedDate} >= ${t.reportedDate}`,
    ),
    index('idx_issues_vehicle_id').on(t.vehicleId),
    index('idx_issues_status_id').on(t.statusId),
    index('idx_issues_priority_id').on(t.priorityId),
  ],
);
