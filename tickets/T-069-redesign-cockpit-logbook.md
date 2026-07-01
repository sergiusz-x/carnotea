---
id: T-069
title: 'Redesign epic — Cockpit panel + unified Dziennik feed'
status: in_progress
priority: high
size: L # split into P1–P6 sub-tickets (T-070…T-075)
spec_version: 1
owner: ~
dependencies: []
labels: [redesign, web, api, epic]
created_at: 2026-06-30
updated_at: 2026-06-30
closed_at: ~
---

# T-069 — Redesign epic — Cockpit panel + unified Dziennik feed

## Goal

Replace the stat-card-grid home + six isolated list tabs with a minimal vehicle
**panel** above one chronological **Dziennik** feed of all events.

## Context

User-approved direction after two iterations (minimal, no gradients/gimmicks).
The full, authoritative plan — vision, IA, contracts, phases, status tracker —
lives in [`docs/redesign/cockpit-logbook-plan.md`](../docs/redesign/cockpit-logbook-plan.md).
Approved static reference: [`docs/redesign/prototype.html`](../docs/redesign/prototype.html).
This epic only tracks the sub-tickets; build against the plan.

## Contract

_See the plan, §3–§7. Two new backend aggregation endpoints
(`/api/vehicles/{vehicleId}/activity`, `/api/vehicles/{vehicleId}/panel`),
shared discriminated-union `ActivityEntry` + `VehiclePanel` schemas, and the web
panel/feed/shell._

### Provides

A unified activity feed + vehicle vitals panel, consumed by the home screen.

### Consumes

Existing per-resource tables/schemas (fuel, charging, service, expenses, issues,
reminders) and the design-system foundation already merged.

## Acceptance criteria

- [ ] All sub-tickets T-070…T-075 are `done`.
- [ ] Home screen renders the panel + Dziennik per the prototype.
- [ ] No regression in the per-type screens or their tests.

## Test matrix

_n/a — proven by sub-tickets._

## Files to touch

- `packages/shared/src/schemas/`, `apps/api/src/`, `apps/web/src/` (see plan).

## Out of scope

- Deleting the existing dashboard widgets — decided with the user in P5.
- Multi-vehicle aggregated feed (feed is per active vehicle for now).

## Implementation notes

Sub-tickets: T-070 (shared), T-071 (api feed), T-072 (api panel), T-073 (web
panel+feed), T-074 (web shell+route), T-075 (mobile+a11y). Keep the plan's
**Status tracker** current as each lands.

## Verification

- Each sub-ticket's Verification, plus final `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## References

- Plan: [`docs/redesign/cockpit-logbook-plan.md`](../docs/redesign/cockpit-logbook-plan.md)
- Pattern: `apps/api/src/dashboard/`, [web-screens](../docs/agents/patterns/web-screens.md)
- Related: T-070, T-071, T-072, T-073, T-074, T-075
