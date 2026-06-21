---
id: T-063
title: Align API paths, vehicle energy invariant, and README
status: in_progress
priority: high
size: M
spec_version: 1
owner: codex
dependencies: [T-020, T-022]
labels: [api, web, db, docs]
created_at: 2026-06-21
updated_at: 2026-06-21
closed_at: ~
---

# T-063 — Align API paths, vehicle energy invariant, and README

## Goal

Remove the remaining architecture-review drift by namespacing app API routes under
`/api`, preventing invalid vehicle energy-source changes, and keeping README as a
small project entry point rather than duplicated implementation detail.

## Context

Architecture review found three issues that should be fixed before more API and web
screens copy the current shape:

- App API routes (`/vehicles`, `/me`) overlap with future SPA routes and with the
  production proxy contract that sends `/api/*` to the API.
- The DB blocks invalid fuel/charging child inserts, but changing a vehicle's fuel
  type can leave existing child rows inconsistent with the vehicle energy source.
- README still describes an earlier repo state and duplicates details already owned
  by `docs/`.

T-061 already tracks atomic derived-sync seams, so this ticket does not touch that
open work. T-026 owns the expenses source invariant follow-up.

## Contract

### Endpoints / routes

| Method | Path                                       | Auth    | Success     | Errors             |
| ------ | ------------------------------------------ | ------- | ----------- | ------------------ |
| GET    | `/api/me`                                  | session | 200 profile | 401, 404           |
| GET    | `/api/vehicles`                            | session | 200 list    | 401                |
| POST   | `/api/vehicles`                            | session | 201 vehicle | 400, 401, 409      |
| GET    | `/api/vehicles/{id}`                       | session | 200 vehicle | 401, 404           |
| PATCH  | `/api/vehicles/{id}`                       | session | 200 vehicle | 400, 401, 404, 409 |
| DELETE | `/api/vehicles/{id}`                       | session | 204         | 401, 404           |
| GET    | `/api/vehicles/{vehicleId}/fuel-logs`      | session | 200 list    | 401, 404           |
| POST   | `/api/vehicles/{vehicleId}/fuel-logs`      | session | 201 log     | 400, 401, 404      |
| GET    | `/api/vehicles/{vehicleId}/fuel-logs/{id}` | session | 200 log     | 401, 404           |
| PATCH  | `/api/vehicles/{vehicleId}/fuel-logs/{id}` | session | 200 log     | 400, 401, 404      |
| DELETE | `/api/vehicles/{vehicleId}/fuel-logs/{id}` | session | 204         | 401, 404           |

Health probes remain `/healthz` and `/readyz`. Auth remains `/api/auth/*`.

### Request / response shapes

No request or response schema changes. Only route paths and domain validation change.

### Provides

- Shared `ROUTES` constants for application API paths under `/api`.
- Vehicle fuel-type update validation that rejects energy-source changes when
  existing fuel/charging child rows would become invalid.
- Lean README that points to the canonical docs instead of duplicating them.

### Consumes

- Existing `VehicleCreateSchema`, `VehicleUpdateSchema`, and fuel-log route schemas.
- Existing DB schema and `enforce_vehicle_energy_source` insert trigger.

## Acceptance criteria

- [x] All app API routes except health/docs/auth are under `/api/*` in shared routes,
      controllers, tests, OpenAPI, and the generated web schema.
- [x] Vite dev proxy forwards `/api/*` to the API so web API calls do not collide
      with SPA routes.
- [x] `PATCH /api/vehicles/{id}` rejects fuel-type changes that would make existing
      fuel logs or charging sessions invalid, with `400 VALIDATION_ERROR`.
- [x] README no longer duplicates stale repo status, full stack tables, or large
      repository maps already owned by docs.
- [x] T-026 records the expenses source-id invariant follow-up.

## Test matrix

| Case                            | Input                                | Expected                  |
| ------------------------------- | ------------------------------------ | ------------------------- |
| API prefix                      | GET `/api/vehicles` with a session   | 200 and service called    |
| old app route not used in tests | controller tests use `/api/vehicles` | route contract pinned     |
| electric with fuel logs         | patch fuelType to `electric`         | 400 VALIDATION_ERROR      |
| ICE-only with charging sessions | patch fuelType to `petrol`           | 400 VALIDATION_ERROR      |
| compatible fuel type change     | patch diesel vehicle to `hybrid`     | update proceeds           |
| web API call                    | health query through `apiClient.GET` | fetches a shared API path |

## Files to touch

- `packages/shared/src/routes.ts`
- `apps/api/src/**`
- `apps/web/src/lib/api/**`, `apps/web/vite.config.ts`
- `docs/agents/patterns/resource-crud-api.md`
- `tickets/T-026-api-expenses-cost-sync.md`
- `README.md`, `package.json`

## Out of scope

- T-061 transaction-composable derived-sync work.
- Implementing expenses CRUD or changing the expenses DB schema now.
- Moving health probes or Swagger/OpenAPI docs.

## Implementation notes

- Keep `/healthz` and `/readyz` outside `/api` so probes stay simple.
- Use service-layer validation for user-facing 400s and rely on DB constraints for
  direct-write protection.

## Verification

- `pnpm --filter @carnotea/api test`
- `pnpm --filter @carnotea/web test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm lint:tickets`

## References

- ADR: [ADR-0003](../docs/adr/0003-rest-openapi-zod.md)
- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Related tickets: T-020, T-022, T-026, T-045, T-061
