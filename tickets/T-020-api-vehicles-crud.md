---
id: T-020
title: API — Vehicles CRUD (user-scoped, OpenAPI)
status: ready
priority: high
owner: ~
dependencies: [T-004, T-005, T-006, T-019]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-020 — API: Vehicles CRUD

## Goal

Expose user-scoped CRUD for `/vehicles` through `zodRoute()`, validated with the
T-019 schemas and documented in `/openapi.json`, so every per-vehicle feature
(fuel, charging, service, …) has an owned parent to hang off.

## Context

Vehicles are the root aggregate of the diary: `vehicles.userId` references the
domain `users` row (linked to the better-auth user by id), and every child
entity cascades from a vehicle. This is the first real feature endpoint and the
first user-scoped resource, so it also establishes the ownership-enforcement and
404-vs-403 patterns the later tickets copy.

## Acceptance criteria

- [ ] `GET /vehicles` lists only the authenticated user's vehicles.
- [ ] `GET /vehicles/:id` returns one owned vehicle; 404 when it does not exist,
      404 (not 403) when it exists but belongs to another user — never leak
      existence across users.
- [ ] `POST /vehicles` creates a vehicle from `VehicleCreate`; `userId` is taken
      from the auth context, never the body.
- [ ] `PATCH /vehicles/:id` updates via `VehicleUpdate`; ownership enforced.
- [ ] `DELETE /vehicles/:id` deletes an owned vehicle (children cascade per DB).
- [ ] Required fields honored: `brand`, `model`, `productionYear`, `fuelTypeId`;
      `vin`/`registrationNumber` uniqueness conflicts surface as a clean 409.
- [ ] Every route is registered via `zodRoute()` and appears in `/openapi.json`
      with request/response schemas and an `ApiError` error shape.
- [ ] Vitest covers create→read→update→delete and a cross-user 404.

## Files to touch

- `apps/api/src/vehicles/` (module, controller/routes, service)
- `apps/api/src/vehicles/vehicles.service.ts` (Drizzle queries, ownership filter)
- `apps/api/src/vehicles/*.test.ts`
- `apps/api/src/app.module.ts` (register module)

## Out of scope

- Mileage sync / current-odometer maintenance — that is T-021.
- Any child-entity endpoints (fuel, charging, service, issues, expenses).
- Web UI — handled by the web slice tickets.

## Implementation notes

- Scope every query by `userId` in the `WHERE` clause; do not fetch-then-check
  in app code where a single filtered query suffices.
- `fuelTypeId` is a `smallint` FK to `fuel_types`; validate the referenced code
  against `FUEL_TYPE_CODES` at the boundary and resolve to the lookup id, or
  let the FK reject — pick the approach used by the lookup-resolution helper.
- `currentMileage` and `currencyCode` have defaults at the DB layer; don't
  require them on create.

## References

- ADR: [ADR-0002](../docs/adr/0002-drizzle-schema-as-code.md)
- Related tickets: T-004/T-005/T-006 (api + auth + db wiring), T-019 (schemas),
  T-021…T-027 (child resources)
- Schema: `packages/db/src/schema/vehicles.ts`
