---
id: T-002
title: Database package — Drizzle schema-as-code + migrations
status: in_progress
priority: high
owner: claude
dependencies: [T-001]
labels: [bootstrap, db]
created_at: 2026-06-13
updated_at: 2026-06-14
closed_at: ~
---

# T-002 — Database package: Drizzle schema-as-code + migrations

## Goal

Create `packages/db` as a typed Drizzle package. The schema is expressed in
Drizzle TypeScript DSL; `drizzle-kit generate` produces SQL migrations from it.
Business logic that lived in stored procedures moves to the NestJS service layer
(covered by later tickets). Two DB-level constraints that guard data integrity
against direct writes are kept as raw SQL in a dedicated migration.

> See [ADR-0002](../docs/adr/0002-drizzle-schema-as-code.md) for the full rationale.

## Context

The root `sql/` directory contains a university-course database schema with
stored procedures, analytics functions, and sync triggers that belong in the
application layer. This ticket re-expresses the _data model_ (tables, indexes,
lookup data) in Drizzle TypeScript; the _behaviour_ (validation, syncing,
calculations) becomes NestJS service logic in later tickets.

`sql/` is left intact as a git reference while this ticket is being worked.
After acceptance criteria are met and the new schema is verified, `sql/` can
be deleted — see the cleanup note at the end.

## Acceptance criteria

- [x] `packages/db/` exists as workspace package `@carnotea/db`.
- [x] `packages/db/src/schema/` contains Drizzle TypeScript schema files
      covering all domain tables from the legacy `sql/01_tables.sql` and
      `sql/02_indexes.sql` (vehicles, fuel_logs, charging_sessions,
      service_records, mileage_readings, issues, reminders, expenses, parts,
      service_parts, part_identifiers, audit_logs, plus all lookup tables).
      `vehicle_json_exports` is **not** carried over (it was a university
      artefact — the API returns JSON directly).
- [x] `packages/db/src/schema/index.ts` re-exports all tables.
- [x] `drizzle.config.ts` at `packages/db/drizzle.config.ts` points at
      `src/schema/index.ts`, `dialect: 'postgresql'`, and
      `out: './migrations'`.
- [x] `pnpm db:generate` produces: `0000_stale_skullbuster.sql` (tables),
      `0001_lyrical_colonel_america.sql` (indexes), `0002_constraints.sql`
      (two DB-level constraint triggers), `0003_seed_lookups.sql` (lookup seed
      data). All registered in `migrations/meta/_journal.json`.
- [ ] `pnpm db:migrate` (calls `drizzle-kit migrate`) applies all pending
      migrations against the local database cleanly.
      **NOT VERIFIED** — Docker unavailable in cloud environment; verify locally.
- [ ] `pnpm db:migrate` applied against a fresh Postgres results in all checks
      in `tests/integrity_audit.sql` returning `passed = true`.
      **NOT VERIFIED** — Docker unavailable in cloud environment; verify locally.
- [x] `packages/db/src/index.ts` exports a `createDb(databaseUrl)` factory
      returning a typed Drizzle client.
- [x] `packages/db/AGENTS.md` documents the day-to-day workflow:
      edit schema → `pnpm db:generate` → review migration diff → `pnpm db:migrate`.
- [x] Root `README.md` and `docs/getting-started.md` reference `pnpm db:migrate`
      (the old "apply each sql/ file by hand" instructions are removed).

## What moves to the service layer (not in scope here)

These are **explicitly out of scope** for this ticket — they will be implemented
as NestJS service methods in the tickets that build the API:

- `add_fuel_log`, `add_charging_session`, `add_service_record`,
  `add_mileage_reading`, `resolve_issue`, `resolve_issue_with_service` →
  NestJS service methods using `db.transaction()`
- `sync_*_mileage_reading`, `sync_*_expense` triggers → service-layer
  transaction logic
- `refresh_vehicle_current_mileage` trigger → computed query
  (`max(mileage) FROM mileage_readings WHERE vehicle_id = ?`)
- `calculate_average_fuel_consumption`, `calculate_total_vehicle_cost`, etc. →
  Drizzle query builder expressions or service methods
- `set_updated_at` trigger → Drizzle `.$onUpdateFn(() => new Date())`
- Audit log triggers → service-layer audit (acceptable for a personal app)
- `export_vehicles_to_json` procedure → API endpoint (dropped from DB)

## Implementation notes

**Two constraints stay in the DB** (`migrations/0001_constraints.sql`):

1. `enforce_vehicle_energy_source` — prevents ICE vehicles from having
   charging sessions and electric vehicles from having fuel logs. Enforcing
   this at the DB level protects against direct `psql` writes and future
   scripts that bypass the API.
2. `enforce_issue_resolved_date` — a resolved issue must have `resolved_date`.
   A `CHECK` constraint can't reference the `issue_statuses` lookup table, so
   a trigger is the only correct implementation.

Use Drizzle's `sql` tag to include raw SQL in a custom migration:

```ts
// drizzle.config.ts — or just write 0001_constraints.sql by hand
```

**Lookup seed data** — the content of `sql/07_seed_data.sql` (fuel_types,
charger_types, issue_statuses, issue_priorities, reminder_statuses,
expense_categories) should be included in `migrations/0001_constraints.sql`
or its own `migrations/0002_seed_lookups.sql` so the DB is usable after a
fresh migrate without a manual step.

**Naming** — Drizzle TypeScript uses camelCase; the database uses snake_case.
Set `casing: 'snake_case'` in `drizzle.config.ts` so Drizzle maps
automatically without per-column name overrides.

**`current_mileage` column** — the legacy schema denormalises this onto
`vehicles` and kept it fresh via trigger. Keep the column for now (it is
useful for display); document in `packages/db/AGENTS.md` that it is updated
by the service layer, not a trigger.

## Cleanup note

Once all acceptance criteria are met and the new schema is verified against
`tests/integrity_audit.sql`, the root `sql/` and `tests/` directories can be
deleted. History is preserved by git. This deletion can happen in the same PR
as this ticket or as a trivial follow-up — either is fine.

## Files to touch

- `packages/db/**` (new)
- `docs/getting-started.md`
- `README.md`
- Optionally delete: `sql/`, `tests/` (or leave for a follow-up)

## Out of scope

- better-auth tables (T-006).
- Seed data for development users / vehicles (later ticket).
- Down migrations (`pnpm db:migrate:down`) — rolling back means `pnpm db:reset`.

## References

- ADR: [ADR-0002](../docs/adr/0002-drizzle-schema-as-code.md)
- Legacy SQL reference: `sql/01_tables.sql`, `sql/02_indexes.sql`,
  `sql/04_triggers.sql` (constraints only)
- Drizzle docs: <https://orm.drizzle.team/docs/sql-schema-declaration>
- Drizzle migrations: <https://orm.drizzle.team/docs/drizzle-kit-generate>

## Notes

- 2026-06-14: `drizzle-kit generate` produces two auto-generated migration files
  (0000 for tables, 0001 for indexes) and the custom `drizzle-kit generate --custom`
  command was used to register `0002_constraints.sql` and `0003_seed_lookups.sql`
  in the migration journal without auto-generating SQL.
- 2026-06-14: `sql` must be imported from `drizzle-orm` (not `drizzle-orm/pg-core`);
  all column/table helpers come from `drizzle-orm/pg-core`.
- 2026-06-14: `migrations/meta/` snapshots added to `.prettierignore` — they are
  generated by drizzle-kit and should not be reformatted.
- 2026-06-14: `pnpm db:migrate` against a live Postgres was NOT verified — Docker
  is unavailable in the cloud execution environment. Migrations should be verified
  locally after merge.
- 2026-06-14: `tests/integrity_audit.sql` updated: removed legacy `SET search_path
TO vehicle_diary`, removed checks for `active_issues_view`,
  `calculate_total_vehicle_cost`, and `vehicle_json_exports` (all are out-of-scope
  university artefacts not present in the new schema).
