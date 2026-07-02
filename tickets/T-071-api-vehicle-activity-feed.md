---
id: T-071
title: API — vehicle activity feed endpoint
status: done
priority: high
size: M
spec_version: 1
owner: codex
dependencies: [T-070]
labels: [redesign, api, activity]
created_at: 2026-06-30
updated_at: 2026-06-30
closed_at: 2026-07-01
---

# T-071 — API — vehicle activity feed endpoint

## Goal

Expose a user-scoped per-vehicle activity feed endpoint that returns one reverse-chronological stream of mixed vehicle events with stable keyset pagination.

## Context

This is phase P2 of epic [T-069](./T-069-redesign-cockpit-logbook.md) and the next concrete step called out in [`docs/redesign/cockpit-logbook-plan.md`](../docs/redesign/cockpit-logbook-plan.md). Web work for the new `Dziennik` feed depends on a frozen backend aggregation seam instead of fetching and merging six lists in the browser.

## Contract

Delta from the existing resource-CRUD API pattern only. This ticket adds one read-only aggregate endpoint under a vehicle and reuses the shared `Activity*` schemas from T-070.

### Endpoints / routes

| Method | Path                                 | Auth    | Success                    | Errors                    |
| ------ | ------------------------------------ | ------- | -------------------------- | ------------------------- |
| GET    | `/api/vehicles/{vehicleId}/activity` | session | 200 `ActivityFeedResponse` | 404 NOT_FOUND (not owner) |

### Request / response shapes

Reuse `ActivityEntrySchema`, `ActivityFeedResponseSchema`, and `ActivityQuerySchema` from `@carnotea/shared`. `cursor` is an opaque keyset cursor over `(occurredAt, id)` descending.

### Provides

- `GET /api/vehicles/{vehicleId}/activity`
- `ActivityService.getActivity(userId, vehicleId, query)`
- OpenAPI registration for `ROUTES.vehicleActivity`

### Consumes

- `ROUTES.vehicleActivity`
- `ActivityFeedResponseSchema`, `ActivityQuerySchema`
- Existing user-scoped vehicle ownership rule from vehicle-scoped controllers
- Existing per-resource tables: fuel, charging, service, expenses, issues, reminders

## Acceptance criteria

- [x] `GET /api/vehicles/{vehicleId}/activity` returns a mixed activity feed sorted by `occurredAt` descending, then `id` descending.
- [x] The endpoint accepts `limit` and `cursor` and returns a stable `nextCursor` with no duplicate or skipped items across pages.
- [x] Another user's `vehicleId` returns 404 and does not leak existence.
- [x] Empty vehicles return `{ items: [], nextCursor: null }`.
- [x] The controller is registered in the API app and documented in OpenAPI.

## Test matrix

| Case                 | Input                        | Expected                              |
| -------------------- | ---------------------------- | ------------------------------------- |
| happy path           | vehicle with mixed events    | 200 with items sorted newest-first    |
| pagination page 1    | `limit=2`                    | 200 with 2 items and non-null cursor  |
| pagination page 2    | `limit=2&cursor=...`         | next page, no duplicates or gaps      |
| empty feed           | owned vehicle with no events | 200 `{ items: [], nextCursor: null }` |
| cross-user isolation | another user's vehicle id    | 404 NOT_FOUND                         |
| unauthenticated      | no session                   | 401                                   |

## Files to touch

- `apps/api/src/activity/activity.controller.ts`
- `apps/api/src/activity/activity.service.ts`
- `apps/api/src/activity/activity.module.ts`
- `apps/api/src/activity/activity.controller.test.ts`
- `apps/api/src/app.module.ts`

## Out of scope

- Vehicle panel endpoint (`/panel`) and its derived vitals
- Web UI, query hooks, or i18n
- Deleting or changing the existing per-type screens

## Implementation notes

- Preferred implementation is a single SQL `UNION ALL` with DB-level ordering and keyset pagination. If Drizzle friction is too high, a bounded per-table merge is acceptable only if the external pagination semantics stay identical.
- Include reminder entries in the feed; the shared schema contract from T-070 includes `kind: 'reminder'`.
- Keep ownership enforcement as a single vehicle existence query scoped by `userId`, matching the rest of the API.

## Verification

- `pnpm --filter @carnotea/api typecheck` → clean
- `pnpm --filter @carnotea/api test` → activity controller/tests pass

## References

- Plan: [cockpit-logbook-plan](../docs/redesign/cockpit-logbook-plan.md)
- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Related tickets: [T-069](./T-069-redesign-cockpit-logbook.md), [T-070](./T-070-shared-activity-panel-schemas.md), T-072, T-073
- Schema: `packages/shared/src/schemas/activity.ts`
