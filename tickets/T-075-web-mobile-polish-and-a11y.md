---
id: T-075
title: Web — mobile polish, quick-add alignment, and accessibility pass
status: done
priority: medium
size: M
spec_version: 1
owner: Antigravity
dependencies: [T-074]
labels: [redesign, web, mobile, a11y]
created_at: 2026-06-30
updated_at: 2026-07-21
closed_at: 2026-07-21
---

# T-075 — Web — mobile polish, quick-add alignment, and accessibility pass

## Goal

Finish the redesign with a mobile pass, quick-add/detail polish, and an accessibility/reduced-motion review for the new panel/feed experience.

## Context

This is phase P6 and the final implementation ticket under epic [T-069](./T-069-redesign-cockpit-logbook.md). The main experience is in place after T-074, but the mobile ergonomics and accessibility acceptance still need explicit cleanup.

## Contract

Delta from the existing web-screens pattern only. Adjust the already-shipped panel/feed/shell behavior for mobile and a11y without changing the backend contracts.

### Endpoints / routes

| Method | Path / key   | Auth    | Success                   | Errors                |
| ------ | ------------ | ------- | ------------------------- | --------------------- |
| GET    | `/dashboard` | session | mobile-ready panel + feed | existing query errors |

### Request / response shapes

Reuse existing T-073 and T-074 web contracts. No new shared schemas or routes.

### Provides

- Mobile-ready panel/feed interactions
- Accessibility fixes for the redesigned dashboard experience

### Consumes

- T-073 panel/feed components
- T-074 shell and dashboard composition
- Existing quick-add flows and detail navigation

## Acceptance criteria

- [ ] The redesigned dashboard is usable on a narrow mobile viewport without clipped actions or unreadable stats.
- [ ] Quick-add and detail transitions still make sense from the feed context.
- [ ] New filters, cards, and shell controls have accessible labels and keyboard focus behavior.
- [ ] Reduced-motion users are not forced through decorative motion.

## Test matrix

| Case            | Input                  | Expected                                  |
| --------------- | ---------------------- | ----------------------------------------- |
| mobile viewport | 375px wide dashboard   | content stacks cleanly, controls usable   |
| keyboard nav    | tab through dashboard  | focus order and visible focus are correct |
| reduced motion  | prefers-reduced-motion | non-essential motion is suppressed        |
| screen reader   | cards and filters      | labels and semantics are announced        |

## Files to touch

- `apps/web/src/components/layout/`
- `apps/web/src/features/activity/`
- any affected accessibility helpers/tests

## Out of scope

- New backend capabilities
- Multi-vehicle aggregated feed

## Implementation notes

- Keep this as polish on top of the implemented design, not a new visual direction.

## Notes

- Added a global `@media (prefers-reduced-motion: reduce)` rule to `globals.css` to instantly address all animation/transition suppression without needing to prefix every Tailwind class with `motion-safe:`.
- `StatStrip` minimum column width adjusted to `5.5rem` to prevent wrapping issues on 375px screens with 5 stats.

## Verification

- `pnpm --filter @carnotea/web typecheck` → clean
- `pnpm --filter @carnotea/web test` → affected tests pass
- Browser check in `agent-browser` on mobile and desktop viewports

## References

- Plan: [cockpit-logbook-plan](../docs/redesign/cockpit-logbook-plan.md)
- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: [T-069](./T-069-redesign-cockpit-logbook.md), [T-073](./T-073-web-panel-and-activity-feed.md), [T-074](./T-074-web-shell-and-dashboard-composition.md)
