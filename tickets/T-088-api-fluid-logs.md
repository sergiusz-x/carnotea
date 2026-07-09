---
id: T-088
title: API — Operating fluid changes (fluid logs) CRUD
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-020, T-026]
labels: [api, feature]
created_at: 2026-07-08
updated_at: 2026-07-08
closed_at: ~
---

# T-088 — API: Operating fluid changes (fluid logs)

## Goal

Expose CRUD for vehicle operating-fluid changes (engine oil, brake fluid,
coolant, power steering fluid, washer fluid, …) scoped to an owned vehicle,
with a fluid-type lookup, optional next-due tracking, and cost synced to
`expenses` — surfaced in `/openapi.json`.

## Context

None of the existing resources model this today (confirmed by grepping the
schema and tickets before writing this): `service_records` only has
free-text `title`/`description`, with no category/type field, and
`reminders` has no "kind" column either — a fluid change currently has no
home except a manually-typed service record or reminder, losing any
structured history (what fluid, how much, what it cost, when the next one
is due).

This mirrors `fuel_logs` (T-022) / `charging_sessions` (T-023) — both are
"a dated thing that happened to the vehicle, at a mileage, with a cost" —
copy `apps/api/src/charging-sessions/` and change the fields; it's the
closest existing reference (vehicle-scoped child resource + a type lookup
table + cost-sync, no SoC-style validation quirks to drop).

Follows [`patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md).

## Contract

### Endpoints

| Method | Path                                        | Auth    | Success          | Errors                                   |
| ------ | ------------------------------------------- | ------- | ---------------- | ---------------------------------------- |
| GET    | `/api/vehicles/{vehicleId}/fluid-logs`      | session | 200 `FluidLog[]` | 401, 404 NOT_FOUND                       |
| POST   | `/api/vehicles/{vehicleId}/fluid-logs`      | session | 201 `FluidLog`   | 400 VALIDATION_ERROR, 401, 404 NOT_FOUND |
| GET    | `/api/vehicles/{vehicleId}/fluid-logs/{id}` | session | 200 `FluidLog`   | 401, 404 NOT_FOUND                       |
| PATCH  | `/api/vehicles/{vehicleId}/fluid-logs/{id}` | session | 200 `FluidLog`   | 400, 401, 404 NOT_FOUND                  |
| DELETE | `/api/vehicles/{vehicleId}/fluid-logs/{id}` | session | 204              | 401, 404 NOT_FOUND                       |

List newest-first on `changeDate`, tie-broken by `mileage`.

### Request / response shapes

- New `packages/db/src/schema/fluid-logs.ts`: `fluid_logs` table —
  `id`, `vehicleId` (FK), `fluidTypeId` (FK to new `fluid_types` lookup),
  `changeDate`, `mileage`, `quantityLiters` (nullable numeric — not every
  fluid change has a known quantity, e.g. a top-up), `cost` (nullable
  numeric — server never computes this one, unlike `totalCost` on fuel/
  charging; it's a single direct value, not `quantity × unit price`),
  `intervalKm` / `intervalMonths` (nullable smallint — optional, used to
  compute `nextDueMileage`/`nextDueDate`), `workshopName` (nullable text,
  same convention as `service_records`), `notes` (nullable text),
  `createdAt`.
- New `fluid_types` lookup table (`packages/db/src/schema/lookup-tables.ts`,
  same shape as `fuel_types`): seed codes `engine_oil`, `oil_filter`,
  `brake_fluid`, `coolant`, `power_steering_fluid`, `washer_fluid`,
  `transmission_fluid`, `other`.
- `FluidLogSchema`, `FluidLogCreateSchema`, `FluidLogUpdateSchema` in
  `@carnotea/shared` (`fluid-log.ts`, new). `fluidType` is the stable code
  (from new `FLUID_TYPE_CODES` in `packages/shared/src/constants/`);
  resolved to `fluidTypeId` on write, joined back on read.
- Response includes computed, read-only `nextDueMileage`/`nextDueDate`
  (current `mileage`/`changeDate` + `intervalKm`/`intervalMonths` when both
  the source value and interval are present; `null` otherwise) — reuse
  `computeDueState`'s interval-math approach from
  `packages/shared/src/helpers/due-state.ts` rather than duplicating it.

### Provides

- A fluid log is a cost source (`sourceType='fluid_log'`, new
  `expense_categories` code `fluids`) for the existing `CostSyncService`
  (T-026). **Not** a mileage source like fuel/charging — a fluid change
  doesn't imply the vehicle was driven to that mileage in the same way a
  refuel does, so it deliberately does **not** call
  `MileageSyncService.syncDerivedReading`.

### Consumes

- Vehicle ownership (T-020).
- `CostSyncService.upsertFromSource` / `removeForSource` (T-026, frozen) —
  requires extending its `sourceType` union
  (`apps/api/src/expenses/cost-sync.service.ts`) with `'fluid_log'`, and
  adding the `fluids` row to `expense_categories` seed data. This is a
  **public-contract change** (shared union type) — flag it in the PR per
  AGENTS.md § Ask First rather than changing it silently.
- `packages/shared/src/helpers/due-state.ts`'s interval-math (reused, not
  duplicated, for the computed `nextDue*` fields).

## Acceptance criteria

- [ ] List + single-item `GET`/`PATCH`/`DELETE` ownership-scoped through the
      parent vehicle (cross-user → 404).
- [ ] `POST` creates from `FluidLogCreate`; `cost` is a direct optional
      value (not server-computed — no `quantity × price` rule exists for
      fluids, unlike fuel/charging `totalCost`).
- [ ] `fluidType` resolves from `FLUID_TYPE_CODES`; an unknown code is a
      clean 400 VALIDATION_ERROR, not an FK 500.
- [ ] Boundary validation: `mileage >= 0`, `quantityLiters > 0` when
      present, `cost >= 0` when present, `intervalKm > 0` /
      `intervalMonths > 0` when present.
- [ ] `nextDueMileage`/`nextDueDate` are computed correctly when both the
      relevant interval and base value are present, and `null` when either
      is missing.
- [ ] On create/update/delete, the matching `expenses` row syncs via
      `CostSyncService` with `sourceType='fluid_log'`, category `fluids` —
      **only** when `cost` is present (unlike fuel/charging, cost here is
      optional, so a fluid log with no cost must not create a zero-cost
      expense row).
- [ ] Fluid logs do **not** create or update a mileage reading (explicitly
      tested — this is the one behavioral delta from fuel/charging that's
      easy to copy-paste wrong from the reference implementation).
- [ ] Routes registered via `zodRoute()` and present in `/openapi.json`.

## Test matrix

Inherits the [baseline matrix](../docs/agents/patterns/resource-crud-api.md#baseline-test-matrix-every-crud-resource-inherits-this), plus:

| Case                           | Input                                     | Expected                                    |
| ------------------------------ | ----------------------------------------- | ------------------------------------------- |
| cost is optional               | no `cost` in body                         | 201, `cost: null`, no expense row           |
| cost present syncs expense     | `cost: 45.50`                             | expense row created, category `fluids`      |
| unknown fluid code             | `fluidType: "nope"`                       | 400 VALIDATION_ERROR                        |
| next-due computed              | `mileage: 50000, intervalKm: 10000`       | `nextDueMileage: 60000`                     |
| next-due null without interval | `intervalKm` and `intervalMonths` omitted | `nextDueMileage: null`, `nextDueDate: null` |
| no mileage-reading side effect | valid fluid log created                   | no row added to `mileage_readings`          |
| cross-user isolation           | another user's `vehicleId`                | 404 NOT_FOUND                               |

## Files to touch

- `packages/db/src/schema/fluid-logs.ts` (new)
- `packages/db/src/schema/lookup-tables.ts` (add `fluid_types`)
- `packages/db/migrations/` (new migration via `pnpm db:generate`; seed
  `fluid_types` + `expense_categories.fluids`, following the existing seed
  pattern for `fuel_types`/`charger_types`)
- `packages/shared/src/schemas/fluid-log.ts` (new)
- `packages/shared/src/constants/fluid-types.ts` (new)
- `apps/api/src/fluid-logs/` (module, controller, service — copy
  `apps/api/src/charging-sessions/` structure)
- `apps/api/src/fluid-logs/*.test.ts`
- `apps/api/src/expenses/cost-sync.service.ts` (extend `sourceType` union)
- `apps/web/src/locales/*` (new `fluidType` code labels, pl + en, per
  ADR-0007 — every user-facing string ships in both languages)

## Out of scope

- Web UI (list/form screens, dashboard tiles) — a follow-up ticket once
  the API contract is settled; this ticket is API-only, matching how
  T-022/T-023 shipped API-first.
- Auto-generating a `reminders` row when a fluid log's `nextDueMileage`/
  `nextDueDate` approaches — the computed fields exist so a future
  reminder-integration ticket can read them, but wiring that up is separate
  scope.
- Per-fluid-type default intervals (e.g. "engine oil defaults to every
  10,000 km") — `intervalKm`/`intervalMonths` are always user-supplied per
  log in this ticket; smart defaults are a follow-up.

## Implementation notes

- Resolve `fluidTypeId` through the same lookup-code helper pattern used
  for `fuelTypeId`/`chargerTypeId` (T-020/T-023) so code→id mapping stays
  in one place.
- Decimals follow the settled convention (DB `numeric` strings ↔ contract
  numbers); reuse `positiveDecimalField`/`moneyField` from `_shared.ts`.
- Double-check the `enforce_vehicle_energy_source` trigger
  (`packages/db/migrations/0002_constraints.sql`) doesn't need a fluids
  case — fluid changes apply to every fuel type (ICE and EV both need
  coolant/brake fluid), unlike fuel logs vs. charging sessions which are
  mutually exclusive per vehicle. No trigger change expected, but confirm
  before shipping.

## Verification

- `pnpm --filter @carnotea/api test fluid-logs` → all pass
- `curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(contains("fluid-logs"))'` → all 5 routes present
- Manually verify via `psql`: a fluid log with `cost` set produces exactly
  one `expenses` row with `source_type='fluid_log'`; one without `cost`
  produces zero.

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Reference impl: `apps/api/src/charging-sessions/` (T-023)
- Related tickets: T-020, T-021, T-022, T-023, T-024, T-026
- Schema: `packages/db/src/schema/fluid-logs.ts` (new),
  `packages/db/src/schema/lookup-tables.ts`;
  constants: `packages/shared/src/constants/fluid-types.ts` (new);
  `packages/shared/src/schemas/fluid-log.ts` (new)
