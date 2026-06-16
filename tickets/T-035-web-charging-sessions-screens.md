---
id: T-035
title: Web charging-session screens under a vehicle
status: ready
priority: medium
owner: ~
dependencies: [T-033, T-023]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-035 — Web charging-session screens under a vehicle

## Goal

Let a user view, add, edit, and delete charging sessions for a vehicle, with
list, detail, and form driven by TanStack Query against the typed client.

## Context

Charging sessions are the EV/hybrid counterpart to fuel logs and feed energy
stats and auto-synced expenses. They hang off the vehicle detail hub from T-033,
so this ticket adds `/vehicles/:vehicleId/charging` and consumes the API from
T-023.

## Acceptance criteria

- [ ] `/vehicles/:vehicleId/charging` lists sessions (date, mileage, energy kWh,
      price/kWh, total cost, charger type, SoC start→end, full-charge flag),
      newest first, with loading, empty, and error states.
- [ ] A detail view shows one session's full fields, including SoC range when
      present.
- [ ] Create and edit use the T-031 form stack with the shared Zod charging
      schema: chargeDate, mileage, energyKwh, pricePerKwh, totalCost,
      chargerTypeId, socStartPercent, socEndPercent, stationName, isFullCharge.
- [ ] Charger-type select options derive from `CHARGER_TYPE_CODES` with
      translated labels; SoC fields are optional and validated 0–100 with
      start < end.
- [ ] `totalCost` mirrors `energyKwh × pricePerKwh` in the UI; server check
      governs validity and its error surfaces on the field.
- [ ] Delete asks for confirmation.
- [ ] All reads/writes go through TanStack Query + the typed client; mutations
      invalidate the session list and dependent vehicle mileage/expense queries.
- [ ] Every user-facing string exists in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, create, edit, delete). If Chrome is
      blocked, fall back to documented structural verification and note it.

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/charging/**`
- `apps/web/src/features/charging/**` (components, hooks, query options)
- `apps/web/src/locales/pl/charging.json`, `apps/web/src/locales/en/charging.json`

## Out of scope

- API work for charging (T-023) — typed client consumed as-is.
- Energy analytics (dashboard, T-040).
- Fuel logs (T-034).

## Implementation notes

- Mirror the fuel-log screen structure (T-034) for consistency; the two areas
  are near-identical apart from energy/SoC fields.
- Enforce `socStartPercent < socEndPercent` client-side as a friendly check but
  let the API's SoC checks be authoritative.
- Format currency with the vehicle's `currencyCode`.

## References

- Related tickets: T-033 (vehicle hub), T-023 (API charging), T-031 (forms),
  T-011 (typed client), T-034 (fuel screens — structural twin)
