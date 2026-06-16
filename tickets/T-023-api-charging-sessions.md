---
id: T-023
title: API — Charging sessions CRUD
status: ready
priority: medium
owner: ~
dependencies: [T-020]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-023 — API: Charging sessions

## Goal

Expose CRUD for EV charging sessions scoped to an owned vehicle, with
server-computed cost and validated charger type / energy / SoC fields, surfaced
in `/openapi.json`.

## Context

`charging_sessions` mirrors fuel logs for electric driving: a dated session with
`mileage`, `energyKwh`, `pricePerKwh`, `totalCost`, a `chargerTypeId` FK, optional
`socStartPercent`/`socEndPercent`, `stationName`, and `isFullCharge`. The DB
enforces `totalCost = round(energyKwh * pricePerKwh, 2)`, SoC bounds 0–100, and
`socStart < socEnd`. Like fuel logs, a session is both a mileage source and a
cost source.

## Acceptance criteria

- [ ] `GET /vehicles/:vehicleId/charging-sessions` lists owned sessions, newest
      `chargeDate` first; single-item `GET`/`PATCH`/`DELETE` ownership-scoped
      through the parent vehicle (cross-user → 404).
- [ ] `POST` creates from `ChargingSessionCreate`; `totalCost` computed as
      `round(energyKwh * pricePerKwh, 2)` server-side, never from the body.
- [ ] `chargerTypeId` resolves from `CHARGER_TYPE_CODES`; an unknown code is a
      clean 400, not an FK 500.
- [ ] Boundary validation matches the DB checks: `energyKwh > 0`,
      `pricePerKwh > 0`, `mileage >= 0`, SoC each 0–100, and
      `socStart < socEnd` when both present.
- [ ] On create/update/delete the session's derived mileage reading is synced
      via the T-021 helper (`sourceType = 'charging_session'`).
- [ ] Routes registered via `zodRoute()` and present in `/openapi.json`.
- [ ] Vitest covers cost computation, the SoC-order rejection, and a cross-user 404.

## Files to touch

- `apps/api/src/charging-sessions/` (module, routes, service)
- `apps/api/src/charging-sessions/*.test.ts`

## Out of scope

- Writing the matching `expenses` row (`electricity` category) — that is T-026.
- Aggregate energy/cost analytics — that is T-028.

## Implementation notes

- Resolve `chargerTypeId` through the same lookup helper used for `fuelTypeId`
  in T-020 so code→id mapping stays in one place.
- SoC fields are nullable `smallint`; allow omitting them entirely.

## References

- Related tickets: T-020 (vehicles), T-021 (mileage sync), T-026 (cost sync),
  T-028 (analytics)
- Schema: `packages/db/src/schema/charging-sessions.ts`; constants:
  `packages/shared/src/constants/charger-types.ts`
