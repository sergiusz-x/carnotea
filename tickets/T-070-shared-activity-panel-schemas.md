---
id: T-070
title: 'Shared schemas — ActivityEntry feed + VehiclePanel vitals'
status: done
priority: high
size: M
spec_version: 1
owner: ~
dependencies: []
labels: [redesign, shared, schema]
created_at: 2026-06-30
updated_at: 2026-06-30
closed_at: 2026-06-30
---

# T-070 — Shared schemas — ActivityEntry feed + VehiclePanel vitals

## Goal

Freeze the Zod contract the redesign builds on: a discriminated-union activity
entry, the feed response, and the vehicle vitals panel.

## Context

Foundation (P1) of epic [T-069](./T-069-redesign-cockpit-logbook.md). Boundary-
first: API and web both derive from these. Full design in
[`docs/redesign/cockpit-logbook-plan.md`](../docs/redesign/cockpit-logbook-plan.md) §4.
Mirror the existing schema-per-entity style and `schemas/_shared.ts` helpers.

## Contract

### Endpoints / routes

Adds path constants only (no handlers yet):

| Constant          | Path                                 |
| ----------------- | ------------------------------------ |
| `vehicleActivity` | `/api/vehicles/{vehicleId}/activity` |
| `vehiclePanel`    | `/api/vehicles/{vehicleId}/panel`    |

### Request / response shapes

`ActivityEntrySchema` (discriminated union on `kind`: fuel|charge|service|
expense|issue|reminder), `ActivityFeedResponseSchema`, `ActivityQuerySchema`,
`VehiclePanelSchema` — exact fields in plan §4a/§4b. Types via `z.infer`.

### Provides

`ActivityEntry`, `ActivityKind`, `ActivityFeedResponse`, `ActivityQuery`,
`VehiclePanel` (+ schemas) exported from `@carnotea/shared`; `ROUTES.vehicleActivity`,
`ROUTES.vehiclePanel`.

### Consumes

`schemas/_shared.ts` field helpers; `EXPENSE_CATEGORY_CODES`.

## Acceptance criteria

- [x] `activity.ts` + `vehicle-panel.ts` added and exported from `schemas/index.ts`.
- [x] `ROUTES` has `vehicleActivity` and `vehiclePanel`.
- [x] Unit tests parse a valid entry of each kind and reject a bad discriminant.
- [x] `pnpm --filter @carnotea/shared test` and `typecheck` pass.

## Test matrix

| Case                 | Input                         | Expected         |
| -------------------- | ----------------------------- | ---------------- |
| valid fuel entry     | well-formed fuel object       | parses           |
| valid charge entry   | with soc start/end            | parses           |
| valid reminder entry | dueState + nullable dueDate   | parses           |
| bad discriminant     | `kind: 'spaceship'`           | throws           |
| money coercion       | `totalCost: '61.40'` (string) | parses to number |
| panel happy path     | full vitals object            | parses           |
| panel null vitals    | energy/nextService/avg = null | parses           |

## Files to touch

- `packages/shared/src/schemas/activity.ts` (new)
- `packages/shared/src/schemas/vehicle-panel.ts` (new)
- `packages/shared/src/schemas/activity.test.ts`, `vehicle-panel.test.ts` (new)
- `packages/shared/src/schemas/index.ts`, `packages/shared/src/routes.ts`

## Out of scope

- Any API handler or web code (T-071+).

## Implementation notes

Reuse `positiveDecimalField`/`moneyField`/`mileageField`/`dateField`. The union
must stay renderable + translatable on the web — no human-readable/i18n strings
baked into these schemas.

## Verification

- `pnpm --filter @carnotea/shared test` → all pass (incl. new files)
- `pnpm --filter @carnotea/shared typecheck` → clean

## References

- Plan: [`docs/redesign/cockpit-logbook-plan.md`](../docs/redesign/cockpit-logbook-plan.md) §4
- Pattern: `packages/shared/src/schemas/dashboard.ts`, `schemas/_shared.ts`
- Epic: T-069
