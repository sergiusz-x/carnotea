---
id: T-095
title: Detail-first activity flow and fuel log descriptions
status: done
priority: high
size: M
spec_version: 1
owner: codex
dependencies: [T-034, T-036, T-038, T-073]
labels: [web, api, db, ux, fuel]
created_at: 2026-07-11
updated_at: 2026-07-11
closed_at: 2026-07-11
---

# T-095 — Detail-first activity flow and fuel log descriptions

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Make activity entries open a read-only detail view first, keep activity filters visible and energy-source aware, and add a free-form description to fuel logs end to end.

## Context

The dashboard activity feed currently jumps straight into edit flows for some entry types, which makes quick inspection awkward. The feed also hides its filters when a selected filter yields no results, and it currently exposes the charging filter even for non-electric vehicles.

Fuel logs also need a dedicated description field so manual notes survive in the product instead of being lost outside the system.

## Contract

Fuel-log API contract changes: create/update request bodies may include `description`, and list/detail/export responses return `description` plus the derived `consumptionHint` used by the web UI.

### Endpoints / routes

| Method | Path                                       | Auth | Success                     | Errors      |
| ------ | ------------------------------------------ | ---- | --------------------------- | ----------- |
| GET    | `/api/vehicles/{vehicleId}/fuel-logs`      | yes  | 200 fuel log list           | 401/404     |
| POST   | `/api/vehicles/{vehicleId}/fuel-logs`      | yes  | 201 fuel log                | 400/401/404 |
| PATCH  | `/api/vehicles/{vehicleId}/fuel-logs/{id}` | yes  | 200 fuel log                | 400/401/404 |
| GET    | `/vehicles/$vehicleId/service/$recordId`   | yes  | detail screen               | _n/a_       |
| GET    | `/vehicles/$vehicleId/expenses/$expenseId` | yes  | detail screen               | _n/a_       |
| GET    | `/vehicles/$vehicleId/fuel/$fuelLogId`     | yes  | detail screen with metadata | _n/a_       |

### Request / response shapes

- `FuelLogCreateSchema` and `FuelLogUpdateSchema` accept optional `description: string | null`.
- `FuelLogListItemSchema`, `FuelLogDetailSchema`, and account export payloads return `description: string | null`.
- Fuel-log list/detail responses expose `consumptionHint: number | null` for average consumption derived from the previous full tank.

### Provides

- Read-only service and expense detail routes with explicit edit actions.
- Stable, vehicle-aware activity filters that stay visible in empty states.
- Fuel-log descriptions persisted across DB, API, export, generated web schema, forms, list cards, and detail screens.

### Consumes

- Existing fuel-log mileage/cost sync and export flows from T-022/T-026.
- Existing activity feed and vehicle panel surfaces from T-073.
- Existing service and expense web CRUD flows from T-036/T-038.

## Acceptance criteria

- [ ] Clicking service and expense entries from the activity feed opens read-only detail views with explicit edit actions.
- [ ] Activity filters stay visible when a filter returns no records, and charging/fuel filters only appear for compatible vehicle energy types.
- [ ] Fuel logs persist an optional description through DB schema, API, generated web contract, forms, details, list cards, and account export.
- [ ] Fuel log list/detail shows derived average consumption when it can be computed from the previous full tank.

## Test matrix

| Case                             | Input                                         | Expected                                                       |
| -------------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| service activity navigation      | click service card in dashboard activity feed | opens `/service/$recordId` detail route, edit action visible   |
| expense activity navigation      | click expense card in dashboard activity feed | opens `/expenses/$expenseId` detail route, edit action visible |
| empty filtered activity state    | select filter with zero matching records      | filter chips remain visible and empty-state copy renders       |
| vehicle-aware filters            | petrol vehicle dashboard view                 | no charging filter is shown                                    |
| fuel description persistence     | create or update fuel log with description    | description appears in API responses, list card, and detail    |
| derived fuel consumption display | consecutive full-tank fuel logs               | later log exposes and renders `consumptionHint`                |

## Files to touch

- `packages/db/src/schema/fuel-logs.ts`
- `packages/db/migrations/0012_real_karma.sql`
- `packages/shared/src/schemas/fuel-log.ts`
- `apps/api/src/fuel-logs/*`
- `apps/api/src/account/account.controller.ts`
- `apps/web/src/features/fuel-logs/*`
- `apps/web/src/features/service/*`
- `apps/web/src/features/expenses/*`
- `apps/web/src/routes/_authenticated/vehicles/$vehicleId/**`
- `apps/web/src/lib/api/schema.d.ts`
- `tickets/INDEX.md`

## Out of scope

- Bulk import or migration of historical external fuel notes.
- Any change to charging-session descriptions.
- Any redesign of the overall dashboard layout beyond the affected interactions.

## Implementation notes

- Add a nullable `description` column to `fuel_logs` via generated Drizzle migration.
- Keep ownership checks and derived mileage/cost sync behavior unchanged.
- Regenerate `apps/web/src/lib/api/schema.d.ts` after the API contract change.
- Implemented in `fix/activity-detail-flow` and browser-verified against a seeded local environment on 2026-07-11.

## Verification

- `pnpm format:check` → pass
- `pnpm lint` → pass
- `pnpm typecheck` → pass
- `pnpm test` → pass
- `pnpm build` → pass
- `pnpm lint:tickets` → pass
- `pnpm --filter @carnotea/web exec vite --port 5174` + browser pass on `http://localhost:5174` → verified detail-first navigation, persistent filters, vehicle-aware filters, fuel descriptions, and consumption hints

## References

- Related tickets: T-022, T-026, T-034, T-036, T-038, T-073
- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Schema: `packages/db/src/schema/fuel-logs.ts`, `packages/shared/src/schemas/fuel-log.ts`
