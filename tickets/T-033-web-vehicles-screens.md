---
id: T-033
title: Web vehicles screens — list, detail hub, create/edit/delete
status: ready
priority: high
owner: ~
dependencies: [T-031, T-032, T-020, T-011]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-033 — Web vehicles screens: list, detail hub, create/edit/delete

## Goal

Ship the vehicles area in `apps/web` — a list of the user's vehicles, a detail
page that doubles as the per-vehicle hub (current mileage + links to every log),
and create/edit/delete flows — all data-driven via TanStack Query against the
typed client.

## Context

Vehicles are the root entity every other diary screen (fuel, charging, service,
issues, expenses, reminders) hangs off. This ticket establishes the routing
shape (`/vehicles`, `/vehicles/:vehicleId`) and the detail hub that later
feature tickets (T-034…T-039) link into, so it must land before them. Mileage
readings have no standalone screen — they are created and listed from the
vehicle detail page, and `currentMileage` is shown there.

## Acceptance criteria

- [ ] `/vehicles` lists vehicles (brand, model, year, fuel type, current
      mileage) with loading, empty, and error states; empty state has a
      "create vehicle" call to action.
- [ ] `/vehicles/:vehicleId` is the hub: shows vehicle details + `currentMileage`
      and links to fuel, charging, service, issues, expenses, and reminders.
- [ ] Create and edit use the T-031 form stack (react-hook-form + the shared Zod
      vehicle schema) covering brand, model, generation, productionYear, engine,
      fuelTypeId, vin, registrationNumber, currencyCode; server validation
      errors surface on the right fields.
- [ ] Delete asks for confirmation and warns that all linked logs cascade.
- [ ] Mileage readings are managed from the detail page: list readings and add a
      manual reading (readingDate, mileage, note); no separate route.
- [ ] All vehicle/mileage data is fetched and mutated through TanStack Query and
      the typed client; mutations invalidate the relevant query keys.
- [ ] Every user-facing string exists in both `pl` and `en`; no hardcoded JSX
      strings.
- [ ] Verified in agent-browser (list, detail, create, edit, delete). If Chrome
      is blocked, fall back to the documented structural verification and note it.

## Files to touch

- `apps/web/src/routes/vehicles/**` (list, detail, new, edit routes)
- `apps/web/src/features/vehicles/**` (components, hooks, query options)
- `apps/web/src/features/mileage/**` (readings list + add form on detail)
- `apps/web/src/locales/pl/vehicles.json`, `apps/web/src/locales/en/vehicles.json`

## Out of scope

- API work for vehicles (T-020) and mileage; the typed client (T-011) is consumed
  as-is.
- A standalone mileage screen — readings live on the vehicle detail hub only.
- Dashboard/profile screens (T-040, T-041).

## Implementation notes

- Use the shared vehicle Zod schema from `@carnotea/shared` for the form; derive
  the fuel-type select options from `FUEL_TYPE_CODES` with translated labels.
- Keep query keys hierarchical (`['vehicles']`, `['vehicles', id]`,
  `['vehicles', id, 'mileage']`) so detail screens invalidate cleanly.
- The detail hub's log links should route to the child areas the later tickets
  define; stub the links to the planned paths so T-034+ slot in without churn.

## References

- Related tickets: T-031 (web forms), T-032 (app shell/auth), T-020 (API
  vehicles), T-011 (typed client), T-034–T-039 (per-vehicle logs)
