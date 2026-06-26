---
id: T-066
title: Vehicle form VIN lookup autofill
status: backlog
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-033]
labels: [web, vehicles, integration]
created_at: 2026-06-25
updated_at: 2026-06-25
closed_at: ~
---

# T-066 — Vehicle form VIN lookup autofill

## Goal

Let a user enter only a VIN on the vehicle form and autofill the supported vehicle fields from a decoded VIN source.

## Context

Manual vehicle entry works, but adding a vehicle is tedious when the VIN already contains make/model/year information. This should extend the existing T-033 vehicle create/edit form without changing the core vehicle ownership model.

## Contract

### Endpoints / routes

| Method | Path | Auth    | Success                | Errors                       |
| ------ | ---- | ------- | ---------------------- | ---------------------------- |
| TBD    | TBD  | session | decoded vehicle fields | provider / validation errors |

### Request / response shapes

Add a Zod-validated VIN decode response shape once the data source is chosen. The decoded fields should map only to existing editable vehicle fields: `brand`, `model`, `productionYear`, `engine`, `fuelType` when confidently known, and optionally `generation`.

### Provides

- A VIN lookup/autofill action on the vehicle create form.
- A documented server-side seam or client-safe provider integration for VIN decoding.

### Consumes

- T-033 vehicle form and create/update routes.
- Existing `VehicleCreateSchema` / `VehicleUpdateSchema` fields.

## Acceptance criteria

- [ ] Vehicle create form supports entering a VIN and triggering autofill before submit.
- [ ] Autofill populates only empty fields by default, or asks before overwriting user-edited values.
- [ ] VIN lookup validates VIN length/format before calling the provider.
- [ ] Provider failures show a non-blocking localized error and do not prevent manual entry.
- [ ] The chosen provider/API key/secrets model is documented before implementation.
- [ ] All new user-facing strings exist in `pl` and `en`.

## Test matrix

| Case          | Input                              | Expected                                     |
| ------------- | ---------------------------------- | -------------------------------------------- |
| valid VIN     | 17-character VIN with provider hit | supported empty fields are populated         |
| invalid VIN   | too short/invalid VIN              | localized validation error, no provider call |
| provider miss | valid VIN with no decoded result   | localized non-blocking error                 |
| edited fields | VIN lookup after manual edits      | user data is not silently overwritten        |

## Files to touch

- `apps/web/src/features/vehicles/components/vehicle-form.tsx`
- `apps/web/src/locales/{pl,en}/vehicles.json`
- Optional API/provider module once the provider is selected
- `.env.example` and docs if a provider key is required

## Out of scope

- Changing the vehicle database schema.
- Guessing fields not returned confidently by the provider.
- Bulk VIN import.

## Implementation notes

- Decide provider first. If the provider needs a secret or has CORS/rate limits, do the lookup through the API, not directly from the browser.
- Keep manual entry fully usable when lookup is unavailable.

## Verification

- `pnpm --filter @carnotea/web typecheck` → succeeds
- `pnpm --filter @carnotea/web test vehicles` → succeeds
- Browser check: enter VIN, autofill, then save vehicle manually

## References

- Related ticket: [T-033](./T-033-web-vehicles-screens.md)
