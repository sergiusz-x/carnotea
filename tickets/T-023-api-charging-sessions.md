---
id: T-023
title: API — Charging sessions CRUD
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-020, T-021]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-023 — API: Charging sessions

## Goal

Expose CRUD for EV charging sessions scoped to an owned vehicle, with
server-computed cost and validated charger-type / energy / SoC fields, surfaced in
`/openapi.json`.

## Context

`charging_sessions` mirrors fuel logs for electric driving: a dated session with
`mileage`, `energyKwh`, `pricePerKwh`, `totalCost`, a `chargerTypeId` FK, optional
`socStartPercent`/`socEndPercent`, `stationName`, and `isFullCharge`. The DB
enforces `totalCost = round(energyKwh * pricePerKwh, 2)`, SoC bounds 0–100, and
`socStart < socEnd`. Like fuel logs, a session is both a mileage source and a cost
source. This is a near-exact copy of T-022 (fuel logs) — copy
`apps/api/src/fuel-logs/` and change the fields.

Follows [`patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md).

## Contract

### Endpoints

| Method | Path                                           | Auth    | Success                 | Errors                                   |
| ------ | ---------------------------------------------- | ------- | ----------------------- | ---------------------------------------- |
| GET    | `/vehicles/{vehicleId}/charging-sessions`      | session | 200 `ChargingSession[]` | 401, 404 NOT_FOUND                       |
| POST   | `/vehicles/{vehicleId}/charging-sessions`      | session | 201 `ChargingSession`   | 400 VALIDATION_ERROR, 401, 404 NOT_FOUND |
| GET    | `/vehicles/{vehicleId}/charging-sessions/{id}` | session | 200 `ChargingSession`   | 401, 404 NOT_FOUND                       |
| PATCH  | `/vehicles/{vehicleId}/charging-sessions/{id}` | session | 200 `ChargingSession`   | 400, 401, 404 NOT_FOUND                  |
| DELETE | `/vehicles/{vehicleId}/charging-sessions/{id}` | session | 204                     | 401, 404 NOT_FOUND                       |

List newest-first on `chargeDate`, tie-broken by `mileage`.

### Request / response shapes

- `ChargingSessionSchema`, `ChargingSessionCreateSchema`,
  `ChargingSessionUpdateSchema` in `@carnotea/shared` (`charging-session.ts`,
  exists). `totalCost` is **omitted from create/update** and computed server-side.
- `chargerType` is the stable code (from `CHARGER_TYPE_CODES`); resolved to
  `chargerTypeId` on write, joined back on read.
- SoC fields are optional; the `socStart < socEnd` rule is expressed as a Zod
  `superRefine` so both apps reject it before the DB check.

### Provides

- A charging session is a mileage source (`sourceType='charging_session'`) and a
  cost source for T-026.

### Consumes

- `MileageSyncService.syncDerivedReading` / `removeDerivedReading` (T-021, frozen).
- Vehicle ownership (T-020); charger-type lookup resolver shape (T-020).

## Acceptance criteria

- [ ] List + single-item `GET`/`PATCH`/`DELETE` ownership-scoped through the
      parent vehicle (cross-user → 404).
- [ ] `POST` creates from `ChargingSessionCreate`; `totalCost` computed as
      `round(energyKwh * pricePerKwh, 2)` server-side, never from the body.
- [ ] `chargerType` resolves from `CHARGER_TYPE_CODES`; an unknown code is a clean
      400 VALIDATION_ERROR, not an FK 500.
- [ ] Boundary validation matches the DB checks: `energyKwh > 0`,
      `pricePerKwh > 0`, `mileage >= 0`, each SoC 0–100, and `socStart < socEnd`
      when both present.
- [ ] On create/update/delete the session's derived mileage reading is synced via
      the T-021 helper (`sourceType = 'charging_session'`).
- [ ] Routes registered via `zodRoute()` and present in `/openapi.json`.

## Test matrix

Inherits the [baseline matrix](../docs/agents/patterns/resource-crud-api.md#baseline-test-matrix-every-crud-resource-inherits-this), plus:

| Case                      | Input                                   | Expected               |
| ------------------------- | --------------------------------------- | ---------------------- |
| cost computed server-side | energyKwh=10, price=1.20, body cost=999 | `totalCost=12.00`      |
| SoC order rejected        | socStart=80, socEnd=20                  | 400 VALIDATION_ERROR   |
| SoC out of range rejected | socEnd=120                              | 400 VALIDATION_ERROR   |
| unknown charger code      | `chargerType: "nope"`                   | 400 VALIDATION_ERROR   |
| mileage synced on create  | valid session                           | derived reading exists |
| cross-user isolation      | another user's `vehicleId`              | 404 NOT_FOUND          |

## Files to touch

- `apps/api/src/charging-sessions/` (module, controller, service)
- `apps/api/src/charging-sessions/*.test.ts`

## Out of scope

- Writing the matching `expenses` row (`electricity` category) — that is T-026.
- Aggregate energy/cost analytics — that is T-028.

## Implementation notes

- Resolve `chargerTypeId` through the same lookup helper used for `fuelTypeId` in
  T-020 so code→id mapping stays in one place.
- SoC fields are nullable `smallint`; allow omitting them entirely.
- Decimals follow the settled convention (DB strings ↔ contract numbers); reuse
  `moneyField`/`positiveDecimalField`/`socPercentField` from `_shared.ts`.

## Verification

- `pnpm --filter @carnotea/api test charging-sessions` → all pass
- `curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(contains("charging-sessions"))'` → all 5 routes present

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Reference impl: `apps/api/src/fuel-logs/` (T-022)
- Related tickets: T-020, T-021, T-026, T-028
- Schema: `packages/db/src/schema/charging-sessions.ts`; constants:
  `packages/shared/src/constants/charger-types.ts`;
  `packages/shared/src/schemas/charging-session.ts`
