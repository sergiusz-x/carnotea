---
id: T-019
title: Shared — canonical domain Zod schemas + inferred types
status: in_progress
priority: high
owner: claude
dependencies: [T-003]
labels: [shared, domain]
created_at: 2026-06-15
updated_at: 2026-06-16
closed_at: ~
---

# T-019 — Shared: canonical domain Zod schemas + inferred types

## Goal

Define the single source-of-truth Zod schemas and `z.infer` types in
`@carnotea/shared` for every domain entity so both `apps/api` and `apps/web`
validate and type identical contracts from one place.

## Context

Today `@carnotea/shared` only ships `ApiErrorSchema` + the `constants/*` enum
code lists. Every feature ticket (T-020…T-029) needs request/response schemas,
and the API↔web contract is OpenAPI generated from Zod via `zodRoute()`. Without
a shared schema layer each side would hand-roll parallel types and drift. This
ticket lands the schema layer once so the feature tickets just import it.

## Acceptance criteria

- [x] One schema module per entity under `packages/shared/src/schemas/`:
      `vehicle`, `mileage-reading`, `fuel-log`, `charging-session`,
      `service-record`, `part`, `service-part`, `issue`, `expense`, `reminder`,
      `user-profile`.
- [x] Each module exports a base/read schema plus `Create` and `Update`
      variants (Update = partial of the createable fields).
- [x] Enum/lookup fields use the existing `constants/*` code lists
      (`FUEL_TYPE_CODES`, `CHARGER_TYPE_CODES`, `EXPENSE_CATEGORY_CODES`,
      `ISSUE_STATUS_CODES`, `ISSUE_PRIORITY_CODES`, `REMINDER_STATUS_CODES`) via
      `z.enum`, never re-declared string unions.
- [x] Every exported TS type is produced with `z.infer` — no hand-written
      parallel `type`/`interface` for any schema.
- [x] Monetary/decimal fields (liters, prices, totals, amounts, quantities) and
      odometer/SoC integer bounds match the DB column precision and `check`
      constraints (e.g. `mileage >= 0`, SoC 0–100, currency = 3 chars).
- [x] A reusable list-query schema (pagination + sort + date-range filter) is
      exported for reuse by list endpoints.
- [x] All modules are re-exported from `packages/shared/src/schemas/index.ts`
      and reachable from the package root; both apps can import them.
- [x] Vitest covers a happy path and at least one boundary rejection per entity.

## Files to touch

- `packages/shared/src/schemas/*.ts` (one per entity, new)
- `packages/shared/src/schemas/list-query.ts` (new, shared pagination/sort)
- `packages/shared/src/schemas/index.ts`
- `packages/shared/src/schemas/*.test.ts`
- `packages/shared/AGENTS.md` (document the schema-per-entity convention)

## Out of scope

- HTTP route wiring, controllers, or OpenAPI registration (feature tickets).
- DB schema or migration changes — schemas mirror the existing columns.
- Business rules that need DB access (mileage/cost sync) — those live in the
  API feature tickets.

## Implementation notes

- Mirror the DB exactly: read each `packages/db/src/schema/<entity>.ts` and the
  matching `constants/*`. Decimals are stored as `numeric` → accept stringified
  numbers or `z.coerce.number()`; pick one convention and apply it everywhere.
- `Create` schemas omit server-owned fields (`id`, `createdAt`, `updatedAt`,
  `userId`, computed `totalCost`). Keep ownership scoping out of the body —
  `userId`/`vehicleId` come from the route + auth context.
- Keep the modules dependency-light: schemas only, no NestJS/HTTP imports, so
  `apps/web` can import them without pulling server code.

## Notes

- Schemas model the **API contract**, not the raw DB row: lookup FKs
  (`fuelTypeId`, `chargerTypeId`, `statusId`, `priorityId`, `categoryId`) are
  exposed as their stable string **codes** via `z.enum(<CODE_LIST>)`. The API
  layer maps code ↔ id (feature tickets T-020…T-029).
- One decimal convention: `numeric` columns use `z.coerce.number()` (helpers in
  `_shared.ts`), since Postgres returns `numeric` as strings. `integer` columns
  stay `z.number().int()`.
- DB-computed / server-owned fields are read-only (present in the read schema,
  omitted from `Create`/`Update`): `totalCost`, `totalPrice`, `currentMileage`,
  `notifiedAt`, and sync-managed `sourceType`/`sourceId`.
- `ReminderUpdateSchema` is a plain `.partial()` — the "needs a trigger"
  invariant cannot be checked from a partial body without the persisted row, so
  the API re-validates it against the merged row. Read and Create enforce it.
- `MILEAGE_SOURCE_TYPES` and `EXPENSE_SOURCE_TYPES` are CHECK-constraint lists,
  not lookup tables, so they are declared inline (no `constants/*` entry).
- Vitest was wired into `@carnotea/shared` (config + `test` script + devDeps);
  `*.test.ts` is excluded from `tsconfig.build.json` so it never ships in `dist`.

## References

- ADR: [ADR-0002](../docs/adr/0002-drizzle-schema-as-code.md),
  [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
- Related tickets: T-003 (shared package scaffold), T-020…T-029 (consumers)
- Schema source: `packages/db/src/schema/`, `packages/shared/src/constants/`
