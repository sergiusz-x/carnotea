import { sql } from 'drizzle-orm';
import { check, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    firstName: varchar({ length: 80 }).notNull(),
    lastName: varchar({ length: 80 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('users_email_lowercase_chk', sql`${t.email} = lower(${t.email})`),
    check('users_email_format_chk', sql`position('@' in ${t.email}) > 1`),
  ],
);
