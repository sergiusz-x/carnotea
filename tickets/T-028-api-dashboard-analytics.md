---
id: T-028
title: Dashboard and analytics read endpoints
status: ready
priority: medium
size: L
spec_version: 1
owner: ~
dependencies: [T-022, T-023, T-024, T-026, T-027]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-028 — Dashboard and analytics read endpoints

## Goal

Provide read-only, user-scoped analytics endpoints — cost breakdowns, fuel and
energy consumption stats, upcoming reminders, and recent activity — that power the
web dashboard without the client summing raw entry tables.

## Context

Once fuel, charging, service, and the unified expense ledger (T-026) exist, the
dashboard needs aggregated views over them. The `expenses` table is the single
source of truth for spend (T-026), so cost breakdowns read it rather than
re-summing four source tables; consumption stats still read the source tables for
liters/kWh and mileage deltas.

`size: L` — five endpoints over several tables; stays one PR because they share the
analytics service and schemas. Read-only, so it does **not** follow the CRUD
pattern, but reuses its ownership (404-not-403) and OpenAPI rules.

## Contract

### Endpoints (all read-only, user-scoped)

| Method | Path                                                 | Auth    | Success                   | Errors             |
| ------ | ---------------------------------------------------- | ------- | ------------------------- | ------------------ |
| GET    | `/vehicles/{vehicleId}/analytics/summary`            | session | 200 `VehicleSpendSummary` | 401, 404 NOT_FOUND |
| GET    | `/vehicles/{vehicleId}/analytics/consumption`        | session | 200 `ConsumptionStats`    | 401, 404 NOT_FOUND |
| GET    | `/vehicles/{vehicleId}/analytics/upcoming-reminders` | session | 200 `Reminder[]`          | 401, 404 NOT_FOUND |
| GET    | `/analytics/overview`                                | session | 200 `AccountOverview`     | 401                |
| GET    | `/analytics/recent-activity`                         | session | 200 `ActivityFeed`        | 401                |

`summary` accepts `?from=&to=` (default: last 12 months). `recent-activity`
paginates via the shared `list-query` schema.

### Request / response shapes

- New `@carnotea/shared` schemas in `analytics.ts`: `VehicleSpendSummary`
  (total + per-category + per-month series), `ConsumptionStats` (avg L/100km, avg
  kWh/100km, total energy), `AccountOverview` (total + per-vehicle + count),
  `ActivityFeed` (items with a `kind` discriminator: `fuel | charge | service |
expense`).
- Empty inputs return zeroed/empty stats, never errors.

### Provides

- _n/a_ (read-only leaf; the web dashboard T-040 consumes these).

### Consumes

- The expense ledger (T-026) for spend; source tables for consumption; T-027's
  `dueState` helper + threshold constant for upcoming reminders (do not redefine).

## Acceptance criteria

- [ ] `summary` returns total spend, spend grouped by expense category, and a
      per-month series over a requestable range (default last 12 months).
- [ ] `overview` returns an account-wide rollup across the user's vehicles (total
      spend, spend per vehicle, vehicle count).
- [ ] `consumption` returns fuel economy (avg L/100km from full-tank logs) and EV
      energy stats (avg kWh/100km, total energy) from mileage deltas; vehicles with
      no relevant entries return zeroed/empty stats, not errors.
- [ ] `upcoming-reminders` returns reminders that are `overdue` or `due_soon`
      (reuses T-027's `dueState`), ordered by urgency.
- [ ] `recent-activity` returns a merged, time-ordered feed of the user's latest
      fuel/charge/service/manual-expense entries with a `kind` discriminator,
      paginated.
- [ ] All endpoints read-only, user-scoped (only the caller's vehicles), typed by
      shared Zod schemas exposed in OpenAPI via `zodRoute()`.
- [ ] Currency reflects each vehicle's `currencyCode`; cross-vehicle rollups do
      **not** convert currencies (grouped/labelled per currency).

## Test matrix

| Case                              | Input                             | Expected                          |
| --------------------------------- | --------------------------------- | --------------------------------- |
| summary groups by category        | mixed expenses                    | per-category totals correct       |
| summary month series + range      | `?from=&to=`                      | one bucket per month in range     |
| consumption from full tanks       | full-tank fuel logs               | avg L/100km from mileage deltas   |
| consumption ignores partial fills | a partial fill between full tanks | partial excluded from denominator |
| empty vehicle                     | vehicle with no entries           | zeroed stats, 200 (not error)     |
| overview multi-currency           | vehicles in PLN + EUR             | grouped per currency, not summed  |
| upcoming reminders ordering       | overdue + due_soon + ok           | only overdue/due_soon, by urgency |
| cross-user isolation              | another user's `vehicleId`        | 404 NOT_FOUND                     |

## Files to touch

- `apps/api/src/analytics/` (controller, service, module)
- `packages/db/src/schema/` + `packages/db/migrations/` if DB views are introduced
  (see notes; schema change via `db:generate`, never hand-edit migrations)
- `packages/shared/src/schemas/analytics.ts`
- `apps/api/src/analytics/*.test.ts` (co-located; **no** `apps/api/test/*.e2e-spec.ts`)

## Out of scope

- Web dashboard UI (T-040 consumes these endpoints).
- Forecasting / projections / cost predictions.
- CSV/PDF export of analytics.
- Caching/materialized refresh strategy (plain views or queries for now).

## Implementation notes

- These reads may back onto **DB views** (e.g. a `vehicle_monthly_spend` view)
  defined as Drizzle `pgView`/SQL in `packages/db` and applied via `db:generate` —
  keep heavy `GROUP BY` in SQL, thin in NestJS. A view is a schema change → follow
  `packages/db/AGENTS.md`.
- Consumption: pair consecutive full-tank/full-charge entries by ascending
  mileage; ignore partial fills for the L/100km denominator (same rule as T-022's
  `computeConsumptionHint`).

## Verification

- `pnpm --filter @carnotea/api test analytics` → all pass
- `curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(contains("analytics"))'` → all 5 routes present

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md) (ownership + OpenAPI rules)
- Schema: `expenses.ts`, `fuel-logs.ts`, `charging-sessions.ts`,
  `service-records.ts`, `reminders.ts`
- Related tickets: T-022, T-023, T-024, T-026 (cost ledger), T-027 (`dueState`),
  T-040 (web dashboard)
