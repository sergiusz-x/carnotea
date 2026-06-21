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
    localePref: varchar({ length: 2 }).notNull().default('en'),
    unitsPref: varchar({ length: 8 }).notNull().default('metric'),
    currencyPref: varchar({ length: 3 }).notNull().default('EUR'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('users_email_lowercase_chk', sql`${t.email} = lower(${t.email})`),
    check('users_email_format_chk', sql`position('@' in ${t.email}) > 1`),
    check('users_locale_pref_chk', sql`${t.localePref} in ('pl', 'en')`),
    check('users_units_pref_chk', sql`${t.unitsPref} in ('metric', 'imperial')`),
    check('users_currency_pref_chk', sql`${t.currencyPref} ~ '^[A-Z]{3}$'`),
  ],
);
