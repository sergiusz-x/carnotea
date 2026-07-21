import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tableName: varchar({ length: 120 }).notNull(),
    recordId: uuid().notNull(),
    actorId: uuid().notNull(),
    operation: varchar({ length: 20 }).notNull(),
    oldData: jsonb(),
    newData: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('audit_logs_operation_chk', sql`${t.operation} IN ('INSERT', 'UPDATE', 'DELETE')`),
    index('idx_audit_logs_table_record').on(t.tableName, t.recordId),
  ],
);
