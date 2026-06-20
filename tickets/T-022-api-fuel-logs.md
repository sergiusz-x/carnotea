---
id: T-022
title: API — Fuel logs (refuels) CRUD
status: done
priority: high
owner: claude-sonnet-4-6
dependencies: [T-020]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-20
closed_at: 2026-06-20
---

# T-022 — API: Fuel logs (refuels)

## Goal

Expose CRUD for fuel logs (refuels) scoped to an owned vehicle, with
server-computed cost and consumption hints, validated by the T-019 schemas and
documented in `/openapi.json`.

## Context

`fuel_logs` records a dated refuel with `mileage`, `liters`, `pricePerLiter`,
`totalCost`, optional `stationName`, and `isFullTank`. The DB enforces
`totalCost = round(liters * pricePerLiter, 2)`, so the server must derive total
cost rather than trust the client. Fuel logs are also a mileage source (they
imply an odometer reading) and a cost source (they feed expenses), so they hook
into T-021's sync helper now and T-026's cost sync later.

## Acceptance criteria

- [ ] `GET /vehicles/:vehicleId/fuel-logs` lists an owned vehicle's refuels,
      newest `fuelDate` first; single-item `GET`/`PATCH`/`DELETE` ownership-scoped
      through the parent vehicle (cross-user → 404).
- [ ] `POST` creates from `FuelLogCreate`; `totalCost` is computed server-side as
      `round(liters * pricePerLiter, 2)` and never read from the body.
- [ ] Boundary validation matches the DB checks: `liters > 0`,
      `pricePerLiter > 0`, `mileage >= 0`.
- [ ] On create/update/delete the fuel log's derived mileage reading is synced
      via the T-021 helper (`sourceType = 'fuel_log'`, `sourceId = fuel log id`).
- [ ] Response includes a computed `consumptionHint` (L/100km vs the previous
      full-tank refuel) when derivable, otherwise null — read-only, not stored.
- [ ] Routes registered via `zodRoute()` and present in `/openapi.json`.
- [ ] Vitest covers cost computation, the full-tank consumption calc, and a
      cross-user 404.

## Files to touch

- `apps/api/src/fuel-logs/` (module, routes, service)
- `apps/api/src/fuel-logs/*.test.ts`

## Out of scope

- Writing the matching `expenses` row — that is T-026 (cost sync).
- Multi-vehicle aggregate analytics — that is T-028.

## Implementation notes

- Compute consumption only between consecutive `isFullTank` refuels ordered by
  `mileage`; partial fills break the interval — return null rather than guess.
- Treat `liters`/`pricePerLiter`/`totalCost` consistently with the decimal
  convention chosen in T-019 (string vs coerced number).

## Notes

- T-021 (mileage sync) was not yet implemented; `apps/api/src/mileage/mileage-sync.service.ts`
  was created here with the interface T-021 specifies so T-022 can call it now and T-021
  can flesh out the full mileage-readings CRUD on top later.
- `consumptionHint` is a local response-only field (not in T-019 shared schema); a
  `FuelLogResponseSchema` is defined in the controller that extends the stored fields with it.
- `totalCost` is computed as `Math.round(liters * pricePerLiter * 100) / 100`, matching
  the DB check `round(liters * pricePerLiter, 2)`.

## References

- Related tickets: T-020 (vehicles), T-021 (mileage sync), T-026 (cost sync),
  T-028 (analytics)
- Schema: `packages/db/src/schema/fuel-logs.ts` (note: fuel type lives on the
  vehicle via `FUEL_TYPE_CODES`, not on each refuel)
