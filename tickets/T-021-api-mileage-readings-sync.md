---
id: T-021
title: API — Mileage readings + odometer sync rule
status: ready
priority: medium
owner: ~
dependencies: [T-020]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-021 — API: Mileage readings + mileage sync

## Goal

Expose mileage-reading endpoints for a vehicle and enforce the sync rule that a
vehicle's `currentMileage` always equals the highest known reading, including
the implicit readings created by fuel, charging, and service entries.

## Context

`mileage_readings` records odometer snapshots with a `sourceType`
(`manual` | `fuel_log` | `charging_session` | `service_record`) and, for
non-manual rows, a `sourceId` plus a unique `(vehicleId, sourceType, sourceId)`
index. Fuel/charge/service entries each carry a `mileage` and should leave a
derived reading behind, and `vehicles.currentMileage` must track the latest of
all of them. Centralizing that rule here keeps the child-entity tickets simple.

## Acceptance criteria

- [ ] `GET /vehicles/:vehicleId/mileage-readings` lists an owned vehicle's
      readings, newest first; `POST` creates a `manual` reading.
- [ ] `GET` / `DELETE` of a single reading are ownership-scoped through the
      parent vehicle (cross-user → 404).
- [ ] Manual readings require `sourceId IS NULL`; the API never lets a client
      forge a `fuel_log`/`service_record`/`charging_session` reading directly.
- [ ] After any reading insert/delete, `vehicles.currentMileage` is recomputed
      to the max reading for that vehicle (and the create-time helper is exposed
      for reuse by T-022/T-023/T-024).
- [ ] Creating/updating/deleting a fuel/charge/service entry upserts/removes its
      derived reading keyed by `(vehicleId, sourceType, sourceId)` so it is
      idempotent and survives edits.
- [ ] Mileage validated `>= 0` at the boundary, matching the DB check.
- [ ] Vitest covers: manual reading bumps odometer; a lower reading does not
      lower it; deleting the max reading recomputes downward.

## Files to touch

- `apps/api/src/mileage/` (module, routes, service)
- `apps/api/src/mileage/mileage-sync.service.ts` (shared upsert + recompute)
- `apps/api/src/mileage/*.test.ts`

## Out of scope

- The fuel/charge/service CRUD endpoints themselves (T-022/T-023/T-024) — this
  ticket provides the sync helper they call, not their routes.
- Backfilling readings for pre-existing rows.

## Implementation notes

- Do the recompute and the source-row write in one transaction so the odometer
  can't drift if the second statement fails.
- Reuse the DB unique partial index on non-manual readings for the upsert
  (`ON CONFLICT (vehicleId, sourceType, sourceId)`); don't re-implement
  dedupe in app code.
- Expose `syncDerivedReading({ vehicleId, sourceType, sourceId, mileage, date })`
  and `recomputeCurrentMileage(vehicleId)` as the public seams.

## References

- Related tickets: T-020 (vehicles), T-022/T-023/T-024 (reading sources)
- Schema: `packages/db/src/schema/mileage-readings.ts`,
  `packages/db/src/schema/vehicles.ts`
