---
id: T-034
title: Web fuel-log screens under a vehicle
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-033, T-022]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-034 — Web fuel-log screens under a vehicle

## Goal

Let a user view, add, edit, and delete fuel logs for a vehicle, with the list,
detail, and form all fetched and mutated via TanStack Query against the typed
client.

## Context

Fuel logs are the most frequent diary entry for combustion/hybrid vehicles and feed
both consumption stats and the auto-synced expenses. They hang off the vehicle
detail hub from T-033, so this ticket adds the `/vehicles/$vehicleId/fuel` sub-area
and consumes the API from T-022. Structural twin of T-035 (charging).

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

## Contract

### Routes

| Route                                | Screen      | Data                                 |
| ------------------------------------ | ----------- | ------------------------------------ |
| `/vehicles/$vehicleId/fuel`          | list        | `fuelLogsQueryOptions(vehicleId)`    |
| `/vehicles/$vehicleId/fuel/new`      | create form | —                                    |
| `/vehicles/$vehicleId/fuel/$id`      | detail      | `fuelLogQueryOptions(vehicleId, id)` |
| `/vehicles/$vehicleId/fuel/$id/edit` | edit form   | same                                 |

### Query keys

```
['vehicles', vehicleId, 'fuel-logs']        # list
['vehicles', vehicleId, 'fuel-logs', id]    # one log
```

Mutations also invalidate `['vehicles', vehicleId, 'mileage']` and
`['vehicles', vehicleId, 'expenses']` (a fuel log is a mileage + cost source).

### Request / response shapes

- `FuelLogSchema`, `FuelLogCreateSchema`, `FuelLogUpdateSchema` from
  `@carnotea/shared`. Form fields: `fuelDate`, `mileage`, `liters`, `pricePerLiter`,
  `stationName`, `isFullTank`. **`totalCost` is NOT a form field** — it is
  server-computed (`round(liters × pricePerLiter, 2)`); show it as a read-only
  computed preview. The response's `consumptionHint` is read-only.

### Provides

- _n/a_

### Consumes

- `apiClient.GET/POST/PATCH/DELETE` (T-033 seam), the vehicle-scoped layout (T-033),
  forms (T-031), fuel-logs API (T-022).

## Acceptance criteria

- [ ] `/vehicles/$vehicleId/fuel` lists fuel logs (date, mileage, liters,
      price/liter, total cost, station, full-tank flag) newest first, with loading,
      empty, and error states.
- [ ] A detail view shows one log's full fields, including `consumptionHint` when
      present.
- [ ] Create/edit use the T-031 form stack with the shared schema; `totalCost` shows
      as a read-only computed preview (not editable), and the server stays the source
      of truth — surface its validation error if any.
- [ ] Delete asks for confirmation.
- [ ] All reads/writes via TanStack Query + the typed client; mutations invalidate
      the fuel-log list and the vehicle mileage/expense queries.
- [ ] Every string in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, create, edit, delete); fallback noted if
      Chrome is blocked.

## Test matrix

Inherits the screens baseline, plus:

| Case                       | Expected                                            |
| -------------------------- | --------------------------------------------------- |
| totalCost is read-only     | no editable totalCost input; preview = liters×price |
| consumptionHint shown      | detail shows hint when derivable, hidden otherwise  |
| create invalidates mileage | adding a log refreshes the vehicle `currentMileage` |
| currency formatting        | costs render with the vehicle's `currencyCode`      |

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/fuel/**`
- `apps/web/src/features/fuel/**`
- `apps/web/src/locales/{pl,en}/fuel.json`

## Out of scope

- API work for fuel logs (T-022) — typed client consumed as-is.
- Consumption analytics (dashboard, T-040).
- Charging sessions (T-035).

## Implementation notes

- Reuse the vehicle-scoped layout/route from T-033 so vehicle context (id, currency)
  is available without refetching.
- Show `totalCost` as a derived preview (`liters × pricePerLiter`) but never send it;
  it is omitted from `FuelLogCreateSchema`.
- Format currency with the vehicle's `currencyCode`.

## Verification

- `pnpm --filter @carnotea/web test fuel` → all pass
- `pnpm --filter @carnotea/web dev` → agent-browser exercises list/create/edit/delete
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-033 (vehicle hub), T-022 (API fuel), T-031 (forms), T-011, T-035
