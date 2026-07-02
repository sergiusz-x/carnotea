---
id: T-072
title: API — vehicle panel endpoint
status: done
priority: high
size: M
spec_version: 1
owner: ~
dependencies: [T-070]
labels: [redesign, api, panel]
created_at: 2026-06-30
updated_at: 2026-06-30
closed_at: 2026-07-01
---

# T-072 — API — vehicle panel endpoint

## Goal

Expose a user-scoped per-vehicle panel endpoint that returns the minimal vitals block shown above the redesigned `Dziennik` feed.

## Context

This is phase P3 of epic [T-069](./T-069-redesign-cockpit-logbook.md). The web panel depends on a backend-derived read model for vehicle identity, current energy state, next service, month cost, and average consumption.

## Contract

Delta from the existing resource-CRUD API pattern only. This ticket adds one read-only aggregate endpoint and reuses the shared `VehiclePanelSchema` from T-070.

### Endpoints / routes

| Method | Path                              | Auth    | Success            | Errors                    |
| ------ | --------------------------------- | ------- | ------------------ | ------------------------- |
| GET    | `/api/vehicles/{vehicleId}/panel` | session | 200 `VehiclePanel` | 404 NOT_FOUND (not owner) |

### Request / response shapes

Reuse `VehiclePanelSchema` from `@carnotea/shared`. All derived vitals stay nullable where the stored data does not support a confident value.

### Provides

- `GET /api/vehicles/{vehicleId}/panel`
- `ActivityService.getPanel(userId, vehicleId)` or equivalent panel-specific service seam
- OpenAPI registration for `ROUTES.vehiclePanel`

### Consumes

- `ROUTES.vehiclePanel`
- `VehiclePanelSchema`
- Existing vehicle, charging, expenses, reminders, and consumption data
- `computeDueState` from `@carnotea/shared`

## Acceptance criteria

- [x] EV or hybrid vehicles return `energy.kind = 'charge'` when a latest SoC exists.
- [x] Vehicles without usable energy data return `energy: null`.
- [x] The response includes current month total and previous month total in the vehicle currency.
- [x] The nearest pending reminder is mapped to `nextService` with computed `dueState`.
- [x] Another user's `vehicleId` returns 404 and does not leak existence.

## Test matrix

| Case                    | Input                     | Expected                      |
| ----------------------- | ------------------------- | ----------------------------- |
| EV panel                | EV with charging sessions | 200 with `energy.kind=charge` |
| combustion panel        | ICE vehicle               | 200 with `energy=null`        |
| no reminders            | vehicle without reminders | `nextService=null`            |
| consumption unavailable | no usable full-cycle data | `avgConsumption=null`         |
| cross-user isolation    | another user's vehicle id | 404 NOT_FOUND                 |
| unauthenticated         | no session                | 401                           |

## Files to touch

- `apps/api/src/activity/activity.controller.ts`
- `apps/api/src/activity/activity.service.ts`
- `apps/api/src/activity/activity.controller.test.ts`

## Out of scope

- Activity feed endpoint
- Web query hooks or rendering
- Widget composition decisions on the dashboard route

## Implementation notes

- Reuse the month-cost and consumption shapes from `dashboard.service.ts` where it keeps logic single-sourced.
- Keep uncertain or unsupported values `null`; do not invent synthetic fuel/range data.

## Verification

- `pnpm --filter @carnotea/api typecheck` → clean
- `pnpm --filter @carnotea/api test` → panel controller/tests pass

## References

- Plan: [cockpit-logbook-plan](../docs/redesign/cockpit-logbook-plan.md)
- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Related tickets: [T-069](./T-069-redesign-cockpit-logbook.md), [T-070](./T-070-shared-activity-panel-schemas.md), [T-071](./T-071-api-vehicle-activity-feed.md), T-073
- Schema: `packages/shared/src/schemas/vehicle-panel.ts`
