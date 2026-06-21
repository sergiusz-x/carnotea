---
id: T-021
title: API — Mileage readings + odometer sync rule
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-020]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-021 — API: Mileage readings + mileage sync

## Goal

Expose manual mileage-reading endpoints for a vehicle and enforce the rule that a
vehicle's `currentMileage` always equals the highest known reading, including the
implicit readings created by fuel, charging, and service entries.

## Context

`mileage_readings` records odometer snapshots with a `sourceType`
(`manual` | `fuel_log` | `charging_session` | `service_record`) and, for
non-manual rows, a `sourceId` plus a unique `(vehicleId, sourceType, sourceId)`
partial index. Fuel/charge/service entries each carry a `mileage` and leave a
derived reading behind, and `vehicles.currentMileage` must track the latest of
all of them. Centralizing that rule here keeps the child-entity tickets simple.

The derived-reading seam (`MileageSyncService`) was already created ahead of need
in T-022 (`apps/api/src/mileage/mileage-sync.service.ts`) so fuel logs could call
it. This ticket adds the **manual** reading CRUD on top and owns that service.

Follows [`patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md).

## Contract

### Endpoints

| Method | Path                                              | Auth    | Success                | Errors                         |
| ------ | ------------------------------------------------- | ------- | ---------------------- | ------------------------------ |
| GET    | `/api/vehicles/{vehicleId}/mileage-readings`      | session | 200 `MileageReading[]` | 401, 404 NOT_FOUND             |
| POST   | `/api/vehicles/{vehicleId}/mileage-readings`      | session | 201 `MileageReading`   | 400 VALIDATION_ERROR, 401, 404 |
| GET    | `/api/vehicles/{vehicleId}/mileage-readings/{id}` | session | 200 `MileageReading`   | 401, 404 NOT_FOUND             |
| DELETE | `/api/vehicles/{vehicleId}/mileage-readings/{id}` | session | 204                    | 401, 404 NOT_FOUND             |

No PATCH: a reading is immutable; correct it by delete + create. List is
newest-first on `readingDate`, tie-broken by `id`.

### Request / response shapes

- `MileageReadingSchema`, `MileageReadingCreateSchema` in `@carnotea/shared`
  (`mileage-reading.ts`, already exists). Create accepts `readingDate`, `mileage`
  (`mileageField`, `>= 0`), optional `note`. `sourceType` is forced to `manual`
  server-side; the client may never set `sourceType`/`sourceId`.

### Provides

- `MileageSyncService.syncDerivedReading(tx, { vehicleId, sourceType, sourceId, mileage, date }): Promise<void>`
- `MileageSyncService.removeDerivedReading(tx, { vehicleId, sourceType, sourceId }): Promise<void>`
- `MileageSyncService.recomputeCurrentMileage(tx, vehicleId): Promise<void>`

  The seams take the **caller's transaction** as the first argument so a resource
  service can wrap its insert + sync in one `db.transaction` (see
  [resource-crud-api.md](../docs/agents/patterns/resource-crud-api.md) § Derived-data
  hooks). The stub created in T-022 manages its own transaction; **T-061** retrofits
  it to this `tx`-first shape — this ticket targets the `tx`-first signature, and
  T-023/T-024 consume it as-is.

### Consumes

- Vehicle ownership check (T-020): scope by `vehicles.userId = user.id`.

## Acceptance criteria

- [ ] `GET`/`POST /api/vehicles/{vehicleId}/mileage-readings` and `GET`/`DELETE`
      of one reading are ownership-scoped through the parent vehicle
      (cross-user → 404).
- [ ] `POST` creates a `manual` reading; the API forces `sourceType = 'manual'`
      and `sourceId = NULL` — a client can never forge a derived reading.
- [ ] After any reading insert/delete, `vehicles.currentMileage` is recomputed to
      the max reading for that vehicle, in one transaction.
- [ ] Derived readings from fuel/charge/service are upserted/removed keyed by
      `(vehicleId, sourceType, sourceId)` so edits are idempotent.
- [ ] `mileage` validated `>= 0` at the boundary, matching the DB check.

## Test matrix

| Case                                   | Input                                  | Expected                            |
| -------------------------------------- | -------------------------------------- | ----------------------------------- |
| manual reading bumps odometer          | reading > current                      | `currentMileage` rises to it        |
| lower manual reading does not lower it | reading < current                      | `currentMileage` unchanged          |
| deleting the max reading recomputes    | delete the highest reading             | `currentMileage` drops to next max  |
| client cannot forge derived reading    | `POST` body with `sourceType=fuel_log` | stored as `manual`, `sourceId` NULL |
| negative mileage rejected              | `mileage: -1`                          | 400 VALIDATION_ERROR                |
| cross-user isolation                   | another user's `vehicleId`             | 404 NOT_FOUND                       |
| derived upsert is idempotent           | sync same `(type,id)` twice            | one row, latest mileage             |

## Files to touch

- `apps/api/src/mileage/` (module, controller, service)
- `apps/api/src/mileage/mileage-sync.service.ts` (already present — reuse)
- `apps/api/src/mileage/*.test.ts`

## Out of scope

- The fuel/charge/service CRUD endpoints themselves (T-022/T-023/T-024) — this
  ticket provides the sync helper they call, not their routes.
- Backfilling readings for pre-existing rows.

## Implementation notes

- Do the recompute and the source-row write in one transaction so the odometer
  can't drift if the second statement fails (the existing service already does).
- Reuse the DB unique partial index on non-manual readings for the upsert
  (`ON CONFLICT (vehicleId, sourceType, sourceId)`); don't re-implement dedupe.
- The `mileage_readings_source_id_chk` DB check enforces manual⇒`sourceId NULL`
  and non-manual⇒`sourceId NOT NULL`; mirror it at the boundary so the client
  gets a 400, not a constraint 500.

## Verification

- `pnpm --filter @carnotea/api test mileage` → all pass
- `curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(contains("mileage-readings"))'` → GET/POST/DELETE present

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Related tickets: T-020 (vehicles), T-022/T-023/T-024 (reading sources)
- Schema: `packages/db/src/schema/mileage-readings.ts`,
  `packages/db/src/schema/api/vehicles.ts`;
  `packages/shared/src/schemas/mileage-reading.ts`
