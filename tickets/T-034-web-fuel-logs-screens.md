---
id: T-034
title: Web fuel-log screens under a vehicle
status: ready
priority: medium
owner: ~
dependencies: [T-033, T-022]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-034 — Web fuel-log screens under a vehicle

## Goal

Let a user view, add, edit, and delete fuel logs for a vehicle, with the list,
detail, and form all fetched and mutated via TanStack Query against the typed
client.

## Context

Fuel logs are the most frequent diary entry for combustion/hybrid vehicles and
feed both consumption stats and the auto-synced expenses. They hang off the
vehicle detail hub from T-033, so this ticket adds the `/vehicles/:vehicleId/fuel`
sub-area and consumes the API from T-022.

## Acceptance criteria

- [ ] `/vehicles/:vehicleId/fuel` lists fuel logs (date, mileage, liters,
      price/liter, total cost, station, full-tank flag) newest first, with
      loading, empty, and error states.
- [ ] A detail view (page or panel) shows one log's full fields.
- [ ] Create and edit use the T-031 form stack with the shared Zod fuel-log
      schema: fuelDate, mileage, liters, pricePerLiter, totalCost, stationName,
      isFullTank.
- [ ] `totalCost` mirrors `liters × pricePerLiter` in the UI; the user can
      override, and the server check still governs validity (surface its error).
- [ ] Delete asks for confirmation.
- [ ] All reads/writes go through TanStack Query + the typed client; mutations
      invalidate the fuel-log list and any vehicle mileage/expense queries that
      depend on it.
- [ ] Every user-facing string exists in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, create, edit, delete). If Chrome is
      blocked, fall back to documented structural verification and note it.

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/fuel/**`
- `apps/web/src/features/fuel/**` (components, hooks, query options)
- `apps/web/src/locales/pl/fuel.json`, `apps/web/src/locales/en/fuel.json`

## Out of scope

- API work for fuel logs (T-022) — typed client consumed as-is.
- Consumption analytics (those land on the dashboard, T-040).
- Charging sessions (T-035).

## Implementation notes

- Reuse the vehicle-scoped layout/route from T-033 so the vehicle context (id,
  currency) is available without refetching.
- Compute `totalCost` client-side as a convenience default but never trust it —
  let the API's `total_cost = round(liters * price, 2)` check be the source of
  truth and map its error onto the field.
- Format currency with the vehicle's `currencyCode`.

## References

- Related tickets: T-033 (vehicle hub), T-022 (API fuel), T-031 (forms),
  T-011 (typed client)
