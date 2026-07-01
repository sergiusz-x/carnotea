---
id: T-073
title: Web — vehicle panel and activity feed
status: in_progress
priority: high
size: L
spec_version: 1
owner: ~
dependencies: [T-071, T-072]
labels: [redesign, web, activity]
created_at: 2026-06-30
updated_at: 2026-07-01
closed_at: ~
---

# T-073 — Web — vehicle panel and activity feed

## Goal

Render the redesigned per-vehicle panel and unified `Dziennik` feed in the web app using the new aggregated API seams.

## Context

This is phase P4 of epic [T-069](./T-069-redesign-cockpit-logbook.md). The web app should stop composing the new dashboard from the old stat widgets and instead consume the dedicated panel/feed contracts from T-071 and T-072.

## Contract

Delta from the existing web-screens pattern only. Add query hooks and UI components for the new aggregate read views.

### Endpoints / routes

| Method | Path / key                           | Auth    | Success                | Errors              |
| ------ | ------------------------------------ | ------- | ---------------------- | ------------------- |
| GET    | `/api/vehicles/{vehicleId}/activity` | session | `ActivityFeedResponse` | existing API errors |
| GET    | `/api/vehicles/{vehicleId}/panel`    | session | `VehiclePanel`         | existing API errors |

### Request / response shapes

Reuse `ActivityEntry`, `ActivityFeedResponse`, and `VehiclePanel` from `@carnotea/shared` plus the generated API schema in `apps/web/src/lib/api/schema.d.ts`.

### Provides

- `features/activity/queries.ts`
- `VehiclePanel`, `ActivityFeed`, and `ActivityEntry` web components
- `activity` i18n namespace in `pl` and `en`

### Consumes

- T-071 activity feed endpoint
- T-072 vehicle panel endpoint
- Shared design primitives: `ListCard`, `StatStrip`, `EmptyState`, `ErrorState`
- Existing active-vehicle state from the app shell

## Acceptance criteria

- [x] The web app has typed query hooks for the panel and paginated activity feed.
- [x] The panel renders vehicle identity and vitals using the minimal design language from the prototype.
- [x] The feed renders entries for each `ActivityKind` and can filter by kind.
- [x] All user-facing strings for the new panel/feed exist in both `pl` and `en`.
- [x] Loading, empty, and error states are handled with existing shared components.
- [x] Each feed entry is interactive: it links to the same screen its own
      feature list already uses (detail page for fuel/issue/reminder, edit
      form for charge/service/expense), and the kind indicator + right-hand
      value read consistently across all six kinds (money for
      fuel/charge/service/expense; the same status-colored `Badge` used on
      that kind's own list card for issue/reminder).

## Test matrix

| Case             | Input                        | Expected                           |
| ---------------- | ---------------------------- | ---------------------------------- |
| panel success    | populated `VehiclePanel`     | vitals render in the correct slots |
| feed mixed items | one entry of each kind       | all variants render correctly      |
| filter by kind   | user selects one filter chip | only that kind remains visible     |
| empty feed       | `items=[]`                   | feed empty state renders           |
| API error        | query rejects                | error state renders                |

## Files to touch

- `apps/web/src/features/activity/`
- `apps/web/src/locales/en/activity.json`
- `apps/web/src/locales/pl/activity.json`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/i18n/i18next.d.ts`

## Out of scope

- Dashboard route composition and shell layout changes
- Mobile-specific polish and accessibility pass

## Implementation notes

- Use `useInfiniteQuery` for the feed cursor.
- Keep the entry title/meta translation logic on the web; the API remains data-only.
- First cut of `ActivityEntryCard` rendered a per-kind icon+text `Badge` plus a
  free-text meta line (station name, workshop, full-tank/full-charge flags,
  charger type, parts count, due mileage) and wasn't clickable. User feedback:
  not interactive, the right-hand value used a different data type per kind
  (money vs. priority word vs. raw date), and the kind badge was a one-off
  pattern not used anywhere else in the app. Redesigned to: (1) a plain muted
  icon tile for the kind (no text, `aria-label` for a11y) instead of a
  Badge — the icon alone already disambiguates the six kinds; (2) the whole
  title+icon block is a `Link` to wherever that kind's own list card already
  sends you (detail page if one exists, else the edit form) — no new routes,
  reuses exactly what `issue-card.tsx`/`reminder-card.tsx`/`charging-card.tsx`
  etc. already point to; (3) the right-hand slot is _either_ the money value
  (fuel/charge/service/expense) _or_ the real status `Badge` from
  `features/issues/badge-variants.ts` / `features/reminders/badge-variants.ts`
  (issue priority / reminder due-state) — the same colored badge already used
  on that kind's own card, not a bespoke text string; (4) dropped the
  free-text meta line entirely, keeping only date + mileage as the subtitle —
  less information, per explicit request, in exchange for consistency.

## Verification

- `pnpm --filter @carnotea/web typecheck` → clean
- `pnpm --filter @carnotea/web test` → new activity component tests pass
- Browser check of panel/feed states in `agent-browser` — **not done this
  pass**, dev stack (Docker) was down; needs a live visual check before this
  ticket can move to `done`.

## References

- Plan: [cockpit-logbook-plan](../docs/redesign/cockpit-logbook-plan.md)
- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: [T-069](./T-069-redesign-cockpit-logbook.md), [T-071](./T-071-api-vehicle-activity-feed.md), [T-072](./T-072-api-vehicle-panel.md), T-074, T-075
