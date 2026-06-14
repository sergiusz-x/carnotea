---
status: accepted
date: 2026-06-14
deciders: [Sergiusz, Claude]
---

# ADR-0002: Drizzle as source of truth; schema in TypeScript

## Context

The project started from a PostgreSQL schema written for a university database
course. That schema contained stored procedures (`add_fuel_log`,
`add_service_record`, `resolve_issue_with_service`, …), analytics functions,
mileage-sync triggers, expense-sync triggers, and an `export_vehicles_to_json`
procedure — patterns from a "thick database" assignment with no longer relevant
university requirements.

Those patterns actively work against a NestJS + Drizzle stack:

- **Procedures = NestJS services written in plpgsql.** Untestable without a
  running database, invisible in NestJS stacktraces, duplicated once the API
  is built.
- **Sync triggers** (`sync_fuel_log_mileage_reading`, `sync_fuel_log_expense`,
  etc.) implement what a single Drizzle `db.transaction()` block does in five
  lines of TypeScript.
- **`export_vehicles_to_json`** is an API endpoint written as a stored
  procedure. The API is where it belongs.
- **`vehicle_json_exports` table** is a materialisation artefact with no place
  in a PWA with a proper REST layer.

## Decision

The schema is expressed in **Drizzle TypeScript DSL** (`packages/db/src/schema/`).
`drizzle-kit generate` derives versioned SQL migration files from it.
`drizzle-kit migrate` applies them to the database.

Business logic that lived in stored procedures moves to **NestJS service
methods** using `db.transaction()`. The DB layer is intentionally thin.

A small number of DB-level constraints that cannot be enforced at the
application boundary without a race condition are kept as **raw SQL inside a
dedicated migration**:

- `enforce_vehicle_energy_source` — prevents ICE vehicles from having
  charging sessions and electric vehicles from having fuel logs.
- `enforce_issue_resolved_date` — a resolved issue must have `resolved_date`.
  A `CHECK` constraint cannot reference the `issue_statuses` lookup table, so
  a trigger is the only correct implementation.

Everything else — `set_updated_at`, mileage sync, expense sync, audit log,
`export_vehicles_to_json`, analytics functions — moves to the service layer
or is dropped as a university artefact.

The root `sql/` directory is preserved as a git reference while T-002 is being
worked. It is not migrated into `packages/db`. Once the new schema is verified,
`sql/` can be deleted.

## Consequences

### Positive

- Schema lives in TypeScript, the same language as the rest of the project.
  No context switch to plpgsql for schema changes.
- `drizzle-kit generate` produces migrations automatically from schema diffs —
  no hand-written SQL for routine changes.
- Service-layer logic is testable with Vitest, mockable, and appears in NestJS
  stacktraces.
- Two constraints remain at the DB level (energy source, resolved date) —
  belt and suspenders for direct database writes.

### Negative

- The existing `sql/` schema is not migrated automatically. T-002 re-expresses
  the data model in Drizzle TypeScript.
- For the two retained constraints we still write raw SQL once (a migration
  file).

### Neutral

- `drizzle-kit introspect` is not used. `drizzle-kit generate` is the only
  drizzle-kit command in the normal workflow.
- better-auth tables are introduced through the same migration mechanism
  (T-006).

## Alternatives considered

### SQL-first + Drizzle introspect

Apply raw SQL migrations → introspect live DB → commit generated `schema.ts`.
Rejected: adds a manual step on every schema change, yields a `schema.ts` no
one edits, and gives no incentive to move logic out of plpgsql.

### Keep procedures as-is, call them from NestJS via raw SQL

Rejected: two languages expressing one layer of business logic, with plpgsql
side untestable in unit tests.
