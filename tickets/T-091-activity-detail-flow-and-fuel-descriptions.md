---
id: T-091
title: Detail-first activity flow and fuel log descriptions
status: in_progress
priority: high
size: M
spec_version: 1
owner: codex
dependencies: [T-034, T-036, T-038, T-073]
labels: [web, api, db, ux, fuel]
created_at: 2026-07-11
updated_at: 2026-07-11
closed_at: ~
---

# T-091 — Detail-first activity flow and fuel log descriptions

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Make activity entries open a read-only detail view first, keep activity filters visible and energy-source aware, and add a free-form description to fuel logs end to end.

## Context

The dashboard activity feed currently jumps straight into edit flows for some entry types, which makes quick inspection awkward. The feed also hides its filters when a selected filter yields no results, and it currently exposes the charging filter even for non-electric vehicles.

Fuel logs also need a dedicated description field so manual notes survive in the product instead of being lost outside the system.

## Contract

Fuel-log API contract changes: create/update request bodies may include `description`, and list/detail responses return `description` plus the derived `consumptionHint` used by the web UI.

### Endpoints / routes

| Method | Path                                       | Auth | Success       | Errors      |
| ------ | ------------------------------------------ | ---- | ------------- | ----------- |
| GET    | `/api/vehicles/{vehicleId}/fuel-logs`      | yes  | 200           | 401/404     |
| POST   | `/api/vehicles/{vehicleId}/fuel-logs`      | yes  | 201           | 400/401/404 |
| PATCH  | `/api/vehicles/{vehicleId}/fuel-logs/{id}` | yes  | 200           | 400/401/404 |
| GET    | `/vehicles/$vehicleId/service/$recordId`   | yes  | detail screen | _n/a_       |
| GET    | `/vehicles/$vehicleId/expenses/$expenseId` | yes  | detail screen | _n/a_       |

### Request / response shapes

- Fuel-log create/update accepts optional `description: string | null`.
- Fuel-log list/detail returns `description: string | null`.
- Fuel-log list/detail returns `consumptionHint: number | null`.

### Provides

- Detail-first navigation from the activity feed and list cards.
- Stable, vehicle-aware activity filters.
- Richer fuel-log notes in API, export, forms, lists, and detail views.

### Consumes

- Existing fuel-log cost and mileage sync flows.
- Existing dashboard activity feed and vehicle panel queries.

## Acceptance criteria

- [ ] Clicking service and expense entries from the activity feed opens read-only detail views with explicit edit actions.
- [ ] Activity filters stay visible when a filter returns no records, and charging/fuel filters only appear for compatible vehicle energy types.
- [ ] Fuel logs persist an optional description through DB schema, API, generated web contract, forms, details, list cards, and account export.
- [ ] Fuel log list/detail shows derived average consumption when it can be computed from the previous full tank.

## Implementation notes

- Add a nullable `description` column to `fuel_logs` via generated Drizzle migration.
- Keep ownership and derived mileage/cost sync behavior unchanged.
- Regenerate `apps/web/src/lib/api/schema.d.ts` after the API contract change.

## Out of scope

- Bulk import or migration of historical external fuel notes.
- Any change to charging-session descriptions.
- Any redesign of the overall dashboard layout beyond the affected interactions.

## Open questions

- _n/a_
