---
id: T-033
title: Web vehicles screens — list, detail hub, create/edit/delete
status: ready
priority: high
size: L
spec_version: 1
owner: ~
dependencies: [T-031, T-032, T-020, T-011]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-033 — Web vehicles screens: list, detail hub, create/edit/delete

## Goal

Ship the vehicles area in `apps/web` — a list of the user's vehicles, a detail page
that doubles as the per-vehicle hub (current mileage + links to every log), and
create/edit/delete flows — all data-driven via TanStack Query against the typed
client.

## Context

Vehicles are the root entity every other diary screen hangs off. This ticket
establishes the routing shape (`/vehicles`, `/vehicles/$vehicleId`), the detail hub
that later feature tickets (T-034…T-039) link into, **and the typed client's write
methods** (`POST`/`PATCH`/`DELETE`), which don't exist yet — `apiClient` is GET-only
today. It must land before the child-screen tickets.

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

## Contract

### Routes

| Route                       | Screen      | Data                                |
| --------------------------- | ----------- | ----------------------------------- |
| `/vehicles`                 | list        | `vehiclesQueryOptions`              |
| `/vehicles/new`             | create form | —                                   |
| `/vehicles/$vehicleId`      | detail hub  | `vehicleQueryOptions(id)` + mileage |
| `/vehicles/$vehicleId/edit` | edit form   | `vehicleQueryOptions(id)`           |

All under the `_authenticated` layout (T-032). The hub links to the child areas
(`/vehicles/$vehicleId/{fuel,charging,service,issues,expenses,reminders}`) defined
by T-034+ — stub the links to the planned paths so they slot in without churn.

### Query keys

```
['vehicles']                       # list
['vehicles', id]                   # one vehicle
['vehicles', id, 'mileage']        # mileage readings on the hub
```

Mutations invalidate the narrowest covering key.

### Request / response shapes

- `VehicleSchema`, `VehicleCreateSchema`, `VehicleUpdateSchema`,
  `MileageReadingCreateSchema` from `@carnotea/shared`. The create form uses
  `fuelType` (the **code**, options from `FUEL_TYPE_CODES` with translated labels),
  not `fuelTypeId`.

### Provides

- **`apiClient.POST` / `PATCH` / `DELETE`** added to `src/lib/api/client.ts`, typed
  from OpenAPI the same way `GET` is and normalizing non-2xx to `ApiError`. **Frozen
  seam** — every later web CRUD ticket (T-034–T-041) consumes these.
- The vehicle-scoped route layout exposing `vehicleId` (+ currency) to child areas.

### Consumes

- The typed `apiClient` (T-011), forms (T-031), app shell/guard (T-032), vehicles +
  mileage API (T-020/T-021).

## Acceptance criteria

- [ ] `apiClient` gains typed `POST`/`PATCH`/`DELETE` mirroring the `GET` design
      (request + response types from `schema.d.ts`, `ApiError` on non-2xx).
- [ ] `/vehicles` lists vehicles (brand, model, year, fuel type, current mileage)
      with loading, empty, and error states; empty state has a "create vehicle" CTA.
- [ ] `/vehicles/$vehicleId` is the hub: vehicle details + `currentMileage` and links
      to fuel, charging, service, issues, expenses, reminders.
- [ ] Create/edit use the T-031 form stack with the shared Zod vehicle schema (brand,
      model, generation, productionYear, engine, **fuelType** code, vin,
      registrationNumber, currencyCode); server validation errors surface on fields,
      and the unique VIN/registration 409 maps to its field.
- [ ] Delete asks for confirmation and warns that all linked logs cascade.
- [ ] Mileage readings managed from the detail page: list readings and add a manual
      reading (readingDate, mileage, note); no separate route.
- [ ] All data fetched/mutated through TanStack Query + the typed client; mutations
      invalidate the relevant keys.
- [ ] Every string in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, detail, create, edit, delete); fallback noted
      if Chrome is blocked.

## Test matrix

Inherits the [screens baseline](../docs/agents/patterns/web-screens.md#baseline-test-matrix-every-screen-inherits-this), plus:

| Case                           | Expected                                              |
| ------------------------------ | ----------------------------------------------------- |
| client POST/PATCH/DELETE typed | wrong path/body is a type error; non-2xx → `ApiError` |
| fuelType options translated    | select lists `FUEL_TYPE_CODES` with pl/en labels      |
| unique conflict on field       | duplicate VIN → 409 surfaces on the `vin` field       |
| delete cascade warning         | confirm dialog mentions linked logs                   |
| manual mileage add             | adding a reading updates `currentMileage` on the hub  |

## Files to touch

- `apps/web/src/lib/api/client.ts` (add write methods)
- `apps/web/src/routes/vehicles/**`
- `apps/web/src/features/vehicles/**`, `apps/web/src/features/mileage/**`
- `apps/web/src/locales/{pl,en}/vehicles.json`

## Out of scope

- API work for vehicles (T-020) and mileage (T-021); typed client consumed as-is.
- A standalone mileage screen — readings live on the hub only.
- Dashboard/profile screens (T-040, T-041).

## Implementation notes

- Add the write methods first; keep them symmetrical with `GET` so the pattern is
  obvious for later tickets.
- Derive fuel-type select options from `FUEL_TYPE_CODES` with translated labels.
- Keep query keys hierarchical so detail screens invalidate cleanly.

## Verification

- `pnpm --filter @carnotea/web test vehicles api/client` → all pass
- `pnpm --filter @carnotea/web dev` → agent-browser exercises list/detail/create/edit/delete
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-031, T-032, T-020, T-021, T-011, T-034–T-039
