---
id: T-088
title: API — Operating fluid changes (fluid logs) CRUD
status: done
priority: medium
size: M
spec_version: 1
owner: claude
dependencies: [T-020, T-026]
labels: [api, web, feature]
created_at: 2026-07-08
updated_at: 2026-07-09
closed_at: 2026-07-09
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

**Scope update (2026-07-09):** the web UI was explicitly requested alongside
the API in the same pass ("zaimplementuj ten ticket... zarówno frontend i
backend"), so it's included here rather than deferred to a follow-up ticket
as originally scoped below. It mirrors `apps/web/src/features/charging/`
exactly (list/form/card + routes + i18n), following
[`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

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
  the source value and interval are present; `null` otherwise). Implemented
  as a small local `addMonths` helper in `fluid-logs.service.ts` — on
  inspection, `computeDueState` in `due-state.ts` classifies an existing
  due date/mileage against thresholds (`overdue`/`due_soon`/`ok`), it
  doesn't do the `base + interval` arithmetic this ticket needs, so it
  wasn't the right thing to force-reuse.

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

## Acceptance criteria

- [x] List + single-item `GET`/`PATCH`/`DELETE` ownership-scoped through the
      parent vehicle (cross-user → 404).
- [x] `POST` creates from `FluidLogCreate`; `cost` is a direct optional
      value (not server-computed — no `quantity × price` rule exists for
      fluids, unlike fuel/charging `totalCost`).
- [x] `fluidType` resolves from `FLUID_TYPE_CODES`; an unknown code is a
      clean 400 VALIDATION_ERROR, not an FK 500.
- [x] Boundary validation: `mileage >= 0`, `quantityLiters > 0` when
      present, `cost >= 0` when present, `intervalKm > 0` /
      `intervalMonths > 0` when present.
- [x] `nextDueMileage`/`nextDueDate` are computed correctly when both the
      relevant interval and base value are present, and `null` when either
      is missing.
- [x] On create/update/delete, the matching `expenses` row syncs via
      `CostSyncService` with `sourceType='fluid_log'`, category `fluids` —
      **only** when `cost` is present (unlike fuel/charging, cost here is
      optional, so a fluid log with no cost must not create a zero-cost
      expense row).
- [x] Fluid logs do **not** create or update a mileage reading (explicitly
      tested — this is the one behavioral delta from fuel/charging that's
      easy to copy-paste wrong from the reference implementation).
- [x] Routes registered via `zodRoute()` and present in `/openapi.json`.
- [x] Web: list/create/edit screens under
      `/vehicles/{vehicleId}/fluid-logs`, reachable from the vehicle detail
      hub's nav (unconditional — fluid changes apply to every fuel type,
      unlike the fuel/charging tabs which are fuel-type-gated), all strings
      in `pl` + `en`.
- [x] Web: discoverable from the **actual current UI**, not just a route —
      a `fluidLogs` item in the sidebar `Nav`, `MobileMoreSheet`, and a
      `fluid` entry in the Dziennik activity feed (filter chip + card
      rendering), backed by `fluidEntries()` in `activity.service.ts` so
      fluid logs actually appear in `GET /api/vehicles/{id}/activity` —
      verified live, not assumed from route registration alone.

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
- `apps/web/src/features/fluid-logs/` (queries, list/form/card components —
  mirrors `apps/web/src/features/charging/`)
- `apps/web/src/routes/_authenticated/vehicles/$vehicleId/fluid-logs/**`
  (route files) + `apps/web/src/routes/_authenticated/vehicles/index.tsx`
  (wiring)
- `apps/web/src/locales/{en,pl}/fluid-logs.json` (new), `i18n/index.ts`,
  `i18n/i18next.d.ts` (namespace registration), `{en,pl}/vehicles.json`
  (`detail.nav.fluidLogs`), `{en,pl}/expenses.json` (`categories.fluids`,
  `sources.fluid_log` — the manual-expense form and expense list already
  read `EXPENSE_CATEGORY_CODES` generically, so the new `fluids` code needed
  its label added there too)
- `apps/web/src/features/vehicles/components/vehicle-detail-hub.tsx` (nav
  link, unconditional unlike `showFuel`/`showCharging`)
- `packages/shared/src/schemas/activity.ts` (`'fluid'` kind,
  `FluidActivitySchema`) + `activity.test.ts`
- `apps/api/src/activity/activity.service.ts` (`fluidEntries()` query,
  added to the `Promise.all` union)
- `apps/web/src/components/layout/nav.tsx`, `mobile-more-sheet.tsx` (sidebar
  - mobile "more" sheet nav items — the actual current UI shell)
- `apps/web/src/features/activity/components/activity-feed.tsx` (filter
  chip), `activity-entry.tsx` (icon/title/link rendering for `kind: 'fluid'`)
- `apps/web/src/locales/{en,pl}/nav.json` (`fluidLogs`),
  `{en,pl}/activity.json` (`filter.fluid`)

## Out of scope

- Auto-generating a `reminders` row when a fluid log's `nextDueMileage`/
  `nextDueDate` approaches — the computed fields exist so a future
  reminder-integration ticket can read them, but wiring that up is separate
  scope.
- Per-fluid-type default intervals (e.g. "engine oil defaults to every
  10,000 km") — `intervalKm`/`intervalMonths` are always user-supplied per
  log in this ticket; smart defaults are a follow-up.

## Implementation notes

- **Correction (2026-07-09, same day):** the web UI as originally shipped
  was reachable only from the old `vehicle-detail-hub.tsx` page
  (`/vehicles/{id}`) — invisible from the actual redesigned UI (left
  sidebar `Nav`/`BottomNav`/`MobileMoreSheet` + the unified "Dziennik"
  activity feed on `/dashboard`, from T-069/T-073/T-074) because nobody
  checked what the live app actually looks like before implementing. Fixed
  in the same PR: added `fluidLogs` to `apps/web/src/components/layout/
nav.tsx`, `bottom-nav.tsx`'s sibling `mobile-more-sheet.tsx`, a `'fluid'`
  kind to `ACTIVITY_KINDS`/`FluidActivitySchema` in
  `packages/shared/src/schemas/activity.ts`, a `fluidEntries()` query in
  `apps/api/src/activity/activity.service.ts` (the Dziennik union had six
  hand-written per-source queries with no generic sourceType mechanism —
  charging/fuel are first-class there, fluids needed the same treatment
  added fresh), and matching filter chip / entry renderer / i18n keys on
  the web. Lesson: before wiring a new resource's nav/discoverability,
  actually open the running app and find where its siblings (the resource
  it was modeled on) are truly linked from — grepping for an old
  `apps/web/src/features/charging/` pattern found a reference implementation
  that was itself only partially representative of current navigation.
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

All run and confirmed green on 2026-07-09, against a real local Postgres
(not just mocks):

- `pnpm --filter @carnotea/api test fluid-logs` → 21/21 pass (14 controller,
  7 service).
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm lint:ws`,
  `pnpm lint:tickets`, `pnpm format:check` → all pass across the whole
  monorepo (`i18n-parity.test.ts` included, confirming `pl`/`en` key parity
  for the new `fluid-logs.json`).
- Live smoke test via `curl` against a running `pnpm --filter @carnotea/api dev`
  - local `pnpm db:up` / `pnpm db:migrate`:
  * `curl localhost:3001/openapi.json` → both `fluid-logs` routes present.
  * Created a fluid log with `cost: 45.50` → response had
    `nextDueMileage: 60000`, `nextDueDate: "2027-01-15"` (from
    `mileage: 50000` + `intervalKm: 10000` / `changeDate: "2026-01-15"` +
    `intervalMonths: 12`) → `GET .../expenses` showed exactly one row,
    `category: "fluids"`, `sourceType: "fluid_log"`.
  * Created a second fluid log with no `cost` → `GET .../expenses` still
    showed exactly one row (no zero-cost row created).
  * `GET .../mileage-readings` stayed `[]` throughout — confirmed no
    mileage-sync side effect.
  * `DELETE` the cost-bearing log → its expense row was removed too (204,
    then `GET .../expenses` → `[]`).
  * Unknown `fluidType`, negative `mileage` → both `400 VALIDATION_ERROR`;
    no-cookie request → `401`.
- `pnpm --filter @carnotea/web codegen:api` run against the local API to
  regenerate `apps/web/src/lib/api/schema.d.ts` with the new routes (this
  generated file must be regenerated from a live API, never hand-edited —
  see AGENTS.md § Never).
- Post-correction: `GET /api/vehicles/{id}/activity` confirmed to return a
  `{"kind":"fluid",...}` entry for a fluid log with no cost — verified live
  against the running API (`curl -b cookies.txt .../activity?limit=30`),
  not just checked by reading the code. Screenshot-driven discovery (the
  user reported "I don't see this anywhere") is what caught the original
  gap; re-verified the fix the same way rather than trusting route
  registration alone.

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Reference impl: `apps/api/src/charging-sessions/` (T-023)
- Related tickets: T-020, T-021, T-022, T-023, T-024, T-026
- Schema: `packages/db/src/schema/fluid-logs.ts` (new),
  `packages/db/src/schema/lookup-tables.ts`;
  constants: `packages/shared/src/constants/fluid-types.ts` (new);
  `packages/shared/src/schemas/fluid-log.ts` (new)
