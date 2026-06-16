---
id: T-028
title: Dashboard and analytics read endpoints
status: ready
priority: medium
owner: ~
dependencies: [T-022, T-023, T-024, T-026]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-028 — Dashboard and analytics read endpoints

## Goal

Provide read-only, user-scoped analytics endpoints — cost breakdowns, fuel and
energy consumption stats, upcoming reminders, and recent activity — that power
the web dashboard without the client summing raw entry tables.

## Context

Once fuel, charging, service, and the unified expense ledger (T-026) exist,
the dashboard needs aggregated views over them. The `expenses` table is the
single source of truth for spend (T-026), so cost breakdowns read it rather than
re-summing four source tables; consumption stats still read the source tables
for liters/kWh and mileage deltas.

## Acceptance criteria

- [ ] `GET /vehicles/:vehicleId/analytics/summary` returns, for one vehicle:
      total spend, spend grouped by expense category, and a per-month spend
      series over a requestable range (default last 12 months).
- [ ] `GET /analytics/overview` returns an account-wide rollup across all the
      user's vehicles (total spend, spend per vehicle, vehicle count).
- [ ] `GET /vehicles/:vehicleId/analytics/consumption` returns fuel economy
      (avg L/100km from full-tank logs) and EV energy stats (avg kWh/100km,
      total energy) computed from mileage deltas; vehicles with no relevant
      entries return zeroed/empty stats, not errors.
- [ ] `GET /vehicles/:vehicleId/analytics/upcoming-reminders` returns reminders
      that are `overdue` or `due_soon` (reuses T-027's `dueState`), ordered by
      urgency.
- [ ] `GET /analytics/recent-activity` returns a merged, time-ordered feed of
      the user's latest fuel / charge / service / manual-expense entries with a
      `kind` discriminator, paginated.
- [ ] All endpoints are read-only, user-scoped (only the caller's vehicles),
      and their responses are typed by shared Zod schemas exposed in OpenAPI via
      `zodRoute()`.
- [ ] Currency in responses reflects each vehicle's `currencyCode`; cross-vehicle
      rollups do **not** convert currencies (grouped/labelled per currency).

## Files to touch

- `apps/api/src/analytics/` (controller, service, module)
- `packages/db/src/schema/views/` + `packages/db/migrations/` if DB views are
  introduced (see notes)
- `packages/shared/src/schemas/analytics.ts`
- `apps/api/test/analytics.e2e-spec.ts`

## Out of scope

- Web dashboard UI (separate web ticket consumes these endpoints).
- Forecasting / projections / cost predictions.
- CSV/PDF export of analytics.
- Caching/materialized refresh strategy (plain views or queries for now).

## Implementation notes

- These reads may back onto **DB views** (e.g. a `vehicle_monthly_spend` view)
  defined as Drizzle `pgView`/SQL in `packages/db` and applied via
  `db:generate` — keep heavy `GROUP BY` logic in SQL, thin in NestJS. If a view
  is added, it's a schema change → follow `packages/db/AGENTS.md` and do not
  hand-edit migrations.
- Consumption: pair consecutive full-tank/full-charge entries by ascending
  mileage; ignore partial fills for the L/100km denominator.
- Reuse the shared `dueState` constant from T-027; do not redefine thresholds.

## References

- Schema: `expenses.ts`, `fuel-logs.ts`, `charging-sessions.ts`,
  `service-records.ts`, `reminders.ts`
- Related tickets: T-022, T-023, T-024, T-026 (cost ledger), T-027 (`dueState`)
