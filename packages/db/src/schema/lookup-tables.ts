import { boolean, numeric, pgTable, smallint, unique, varchar } from 'drizzle-orm/pg-core';

export const fuelTypes = pgTable('fuel_types', {
  id: smallint().generatedAlwaysAsIdentity().primaryKey(),
  code: varchar({ length: 30 }).notNull().unique(),
  sortOrder: smallint().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

export const partIdentifierTypes = pgTable('part_identifier_types', {
  id: smallint().generatedAlwaysAsIdentity().primaryKey(),
  code: varchar({ length: 40 }).notNull().unique(),
  sortOrder: smallint().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

export const issueStatuses = pgTable('issue_statuses', {
  id: smallint().generatedAlwaysAsIdentity().primaryKey(),
  code: varchar({ length: 30 }).notNull().unique(),
  isTerminal: boolean().notNull().default(false),
  sortOrder: smallint().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

export const issuePriorities = pgTable(
  'issue_priorities',
  {
    id: smallint().generatedAlwaysAsIdentity().primaryKey(),
    code: varchar({ length: 30 }).notNull().unique(),
    weight: smallint().notNull(),
    sortOrder: smallint().notNull().default(0),
    isActive: boolean().notNull().default(true),
  },
  (t) => [unique('issue_priorities_weight_uq').on(t.weight)],
);

export const reminderStatuses = pgTable('reminder_statuses', {
  id: smallint().generatedAlwaysAsIdentity().primaryKey(),
  code: varchar({ length: 30 }).notNull().unique(),
  isTerminal: boolean().notNull().default(false),
  sortOrder: smallint().notNull().default(0),
  isActive: boolean().notNull().default(true),
});

export const chargerTypes = pgTable('charger_types', {
  id: smallint().generatedAlwaysAsIdentity().primaryKey(),
  code: varchar({ length: 40 }).notNull().unique(),
  maxKw: numeric({ precision: 6, scale: 1 }),
  sortOrder: smallint().notNull().default(0),
  isActive: boolean().notNull().default(true),
});
