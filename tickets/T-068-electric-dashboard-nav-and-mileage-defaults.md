---
id: T-068
title: Electric dashboard labels, nav visibility, and mileage defaults
status: in_progress
priority: medium
size: M
spec_version: 1
owner: codex
dependencies: [T-033, T-034, T-035, T-036, T-040, T-067]
labels: [web, dashboard, vehicles, ux]
created_at: 2026-06-30
updated_at: 2026-06-30
closed_at: ~
---

# T-068 — Electric dashboard labels, nav visibility, and mileage defaults

## Goal

Make the active-vehicle web UX show charging-oriented copy for EVs, hide fuel-only navigation for EVs, and prefill mileage inputs from the vehicle's latest known mileage.

## Context

Recent web work added active-vehicle dashboard and navigation flows, but EV handling is inconsistent: the dashboard still shows fuel labels for an electric active vehicle, the side navigation still exposes refueling for EVs, and mileage entry flows do not consistently reuse the latest vehicle mileage.

## Contract

Delta from the existing web-screens pattern only. No HTTP route or shared-schema changes.

### Endpoints / routes

| Method | Path                         | Auth    | Success                                              | Errors                |
| ------ | ---------------------------- | ------- | ---------------------------------------------------- | --------------------- |
| GET    | `/dashboard`                 | session | EV-aware overview labels + values                    | existing query errors |
| GET    | `/_authenticated` nav routes | session | EV hides fuel-only nav entry                         | existing query errors |
| GET    | `/vehicles/$vehicleId/*/new` | session | mileage fields prefilled from latest vehicle mileage | existing query errors |

### Request / response shapes

Reuse existing `Vehicle`, `ChargingSession`, fuel-log, charging-session, and service-record web contracts. No new Zod schema.

### Provides

- Shared frontend helper(s) for vehicle capability checks and latest-mileage resolution.
- EV-aware dashboard overview presentation for the active vehicle.
- Consistent mileage defaults across mileage-entry forms.

### Consumes

- `vehiclesQueryOptions`, `vehicleQueryOptions`, `mileageReadingsQueryOptions`
- `chargingSessionsQueryOptions`
- Existing `ActiveVehicleProvider` state

## Acceptance criteria

- [ ] Dashboard overview shows charging cost and average energy consumption labels for an electric active vehicle.
- [ ] Active-vehicle navigation does not show the fuel/refueling entry for an electric vehicle.
- [ ] Mileage inputs in create flows prefill from the vehicle's latest known mileage, including when only `currentMileage` is available.
- [ ] Manual mileage reading add on the vehicle detail page starts from the latest known mileage instead of an empty field.
- [ ] Any new user-facing dashboard strings exist in both `pl` and `en`.

## Test matrix

| Case             | Input                                                       | Expected                                    |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------- |
| EV dashboard     | active vehicle `fuelType = electric` with charging sessions | charging labels + kWh/100km value           |
| ICE dashboard    | active vehicle `fuelType = petrol`                          | existing fuel labels remain                 |
| EV nav           | active vehicle `fuelType = electric`                        | no fuel nav item                            |
| mileage fallback | vehicle has `currentMileage`, no mileage readings           | create flow prefilled from `currentMileage` |
| mileage max      | vehicle has readings above stored `currentMileage`          | create flow uses highest known reading      |

## Files to touch

- `apps/web/src/components/layout/nav.tsx`
- `apps/web/src/features/dashboard/components/dashboard-overview.tsx`
- `apps/web/src/features/vehicles/components/vehicle-detail-hub.tsx`
- `apps/web/src/lib/useLastMileage.ts`
- `apps/web/src/locales/{pl,en}/dashboard.json`

## Out of scope

- Changing dashboard API contracts.
- Hybrid-specific dashboard redesign.
- Editing existing records to overwrite their saved mileage.

## Implementation notes

- Keep the fix inside the web app by deriving EV charging metrics from existing charging-session queries.
- Use a shared helper for vehicle capability checks so nav and detail pages cannot drift again.

## Verification

- `pnpm --filter @carnotea/web typecheck` -> succeeds
- `pnpm --filter @carnotea/web test` -> affected tests pass
- Browser check on `/dashboard` and EV vehicle detail -> pending local manual verification

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: [T-033](./T-033-web-vehicles-screens.md), [T-034](./T-034-web-fuel-logs-screens.md), [T-035](./T-035-web-charging-sessions-screens.md), [T-036](./T-036-web-service-records-screens.md), [T-040](./T-040-web-dashboard-screen.md), [T-067](./T-067-active-vehicle-ux-refactor.md)
