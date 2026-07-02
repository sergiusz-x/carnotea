---
id: T-074
title: Web — shell rail and dashboard composition
status: in_progress
priority: high
size: M
spec_version: 1
owner: ~
dependencies: [T-073]
labels: [redesign, web, shell]
created_at: 2026-06-30
updated_at: 2026-07-02
closed_at: ~
---

# T-074 — Web — shell rail and dashboard composition

## Goal

Compose the new dashboard from the vehicle panel and `Dziennik` feed and restyle the desktop shell into the flat icon rail from the prototype.

## Context

This is phase P5 of epic [T-069](./T-069-redesign-cockpit-logbook.md). The panel/feed components exist after T-073, but they still need to become the primary `/dashboard` experience and integrate with the redesigned desktop shell.

## Contract

Delta from the existing web-screens pattern only. Recompose existing routes and layout without changing the authenticated routing structure.

### Endpoints / routes

| Method | Path / key   | Auth    | Success               | Errors                |
| ------ | ------------ | ------- | --------------------- | --------------------- |
| GET    | `/dashboard` | session | panel + feed composed | existing query errors |

### Request / response shapes

Reuse the T-073 web data layer and existing active-vehicle route/session contracts. No new shared schemas.

### Provides

- `/dashboard` composed from `VehiclePanel` + `ActivityFeed`
- Desktop flat icon rail shell

### Consumes

- T-073 panel/feed components
- Existing authenticated shell, nav, and vehicle switcher

## Acceptance criteria

- [x] Desktop authenticated shell uses the flat icon rail direction from the prototype.
- [x] `/dashboard` renders the panel above the feed as the primary content.
- [x] Existing per-type routes remain reachable from the shell.
- [x] Any decision on the old dashboard widgets is reflected in the ticket notes and code.
- [ ] Browser check on desktop viewport — **not done this pass**, dev stack
      (Docker) was down; needs a live visual check before this ticket can move
      to `done`.

## Test matrix

| Case            | Input                 | Expected                                           |
| --------------- | --------------------- | -------------------------------------------------- |
| desktop shell   | authenticated desktop | flat icon rail renders and highlights active route |
| dashboard route | active vehicle set    | panel renders above feed                           |
| nav continuity  | per-type screen route | route still reachable from navigation              |

## Files to touch

- `apps/web/src/components/layout/app-shell.tsx`
- `apps/web/src/components/layout/nav.tsx`
- `apps/web/src/features/dashboard/components/dashboard-page.tsx`

## Out of scope

- Mobile-specific polish
- Accessibility cleanup beyond what the shell change requires

## Implementation notes

- Ask the user before deleting the old dashboard widgets outright; the plan explicitly calls that out.
- Decision: kept the old analytics widgets (`ExpenseByCategoryChart`,
  `MonthlySpend`, `UpcomingReminders`) below the new panel/feed under an
  "Analytics" section header, rather than deleting them — demoted, not
  removed.

## Verification

- `pnpm --filter @carnotea/web typecheck` → clean
- `pnpm --filter @carnotea/web test` → affected layout/dashboard tests pass
- Browser check on desktop viewport in `agent-browser`

## References

- Plan: [cockpit-logbook-plan](../docs/redesign/cockpit-logbook-plan.md)
- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: [T-069](./T-069-redesign-cockpit-logbook.md), [T-073](./T-073-web-panel-and-activity-feed.md), T-075
