---
id: T-035
title: Web charging-session screens under a vehicle
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-033, T-023]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-035 — Web charging-session screens under a vehicle

## Goal

Let a user view, add, edit, and delete charging sessions for a vehicle, with list,
detail, and form driven by TanStack Query against the typed client.

## Context

Charging sessions are the EV/hybrid counterpart to fuel logs and feed energy stats
and auto-synced expenses. They hang off the vehicle detail hub from T-033, so this
ticket adds `/vehicles/$vehicleId/charging` and consumes the API from T-023.
Structural twin of T-034 — mirror it.

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

## Contract

### Routes

| Route                                    | Screen      | Data                                        |
| ---------------------------------------- | ----------- | ------------------------------------------- |
| `/vehicles/$vehicleId/charging`          | list        | `chargingSessionsQueryOptions(vehicleId)`   |
| `/vehicles/$vehicleId/charging/new`      | create form | —                                           |
| `/vehicles/$vehicleId/charging/$id`      | detail      | `chargingSessionQueryOptions(vehicleId,id)` |
| `/vehicles/$vehicleId/charging/$id/edit` | edit form   | same                                        |

### Query keys

```
['vehicles', vehicleId, 'charging-sessions']        # list
['vehicles', vehicleId, 'charging-sessions', id]    # one session
```

Mutations also invalidate `['vehicles', vehicleId, 'mileage']` and
`['vehicles', vehicleId, 'expenses']`.

### Request / response shapes

- `ChargingSessionSchema`, `ChargingSessionCreateSchema`,
  `ChargingSessionUpdateSchema` from `@carnotea/shared`. Form fields: `chargeDate`,
  `mileage`, `energyKwh`, `pricePerKwh`, **`chargerType` (code, from
  `CHARGER_TYPE_CODES` with translated labels — not `chargerTypeId`)**,
  `socStartPercent`, `socEndPercent`, `stationName`, `isFullCharge`. **`totalCost` is
  NOT a form field** — server-computed; show as a read-only preview.

### Provides

- _n/a_

### Consumes

- `apiClient` write methods (T-033 seam), vehicle-scoped layout (T-033), forms
  (T-031), charging API (T-023).

## Acceptance criteria

- [ ] List shows sessions (date, mileage, energy kWh, price/kWh, total cost, charger
      type, SoC start→end, full-charge flag) newest first, with loading/empty/error.
- [ ] Detail shows one session's full fields, including SoC range when present.
- [ ] Create/edit use the T-031 form stack; charger-type select derives from
      `CHARGER_TYPE_CODES` with translated labels; SoC fields optional, validated
      0–100 with `start < end`; `totalCost` read-only preview.
- [ ] Delete asks for confirmation.
- [ ] All reads/writes via TanStack Query + typed client; mutations invalidate the
      session list and dependent mileage/expense queries.
- [ ] Every string in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, create, edit, delete); fallback noted.

## Test matrix

Inherits the screens baseline, plus:

| Case                           | Expected                                            |
| ------------------------------ | --------------------------------------------------- |
| chargerType options translated | select lists `CHARGER_TYPE_CODES` with pl/en labels |
| SoC order client check         | start ≥ end shows a field error before submit       |
| SoC server error mapping       | API SoC 400 surfaces on the SoC fields              |
| totalCost read-only            | no editable totalCost input; preview = energy×price |

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/charging/**`
- `apps/web/src/features/charging/**`
- `apps/web/src/locales/{pl,en}/charging.json`

## Out of scope

- API work for charging (T-023) — typed client consumed as-is.
- Energy analytics (dashboard, T-040).
- Fuel logs (T-034).

## Implementation notes

- Mirror the fuel-log screen structure (T-034); the two areas are near-identical
  apart from energy/SoC fields.
- Enforce `socStartPercent < socEndPercent` client-side as a friendly check; the API
  checks stay authoritative.
- Format currency with the vehicle's `currencyCode`.

## Verification

- `pnpm --filter @carnotea/web test charging` → all pass
- `pnpm --filter @carnotea/web dev` → agent-browser exercises list/create/edit/delete
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-033, T-023, T-031, T-011, T-034 (structural twin)
