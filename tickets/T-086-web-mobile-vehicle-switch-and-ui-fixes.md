---
id: T-086
title: 'Web — mobile vehicle switching, StatStrip wrap, trend label, and textarea fields'
status: in_progress
priority: high
size: M
spec_version: 1
owner: ~
dependencies: []
labels: [web, bug, mobile, ux]
created_at: 2026-07-05
updated_at: 2026-07-05
closed_at: ~
---

# T-086 — Mobile vehicle switching, StatStrip wrap, trend label, and textarea fields

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Fix five small, unrelated bugs reported from real usage: the vehicle switcher
is unusable on mobile, switching the active vehicle doesn't keep you on the
same panel (and doesn't fall back sanely when the new vehicle lacks that
panel), the vehicle panel's `StatStrip` breaks visually on narrow viewports,
the "tyle co poprzednio" trend text renders with no label context, and two
forms use a single-line input for what should be a multi-line description.

## Context

Found in a live-usage bug report session (2026-07-05), not from a design
audit. Root causes and reference implementations, from investigation:

1. **Mobile vehicle switcher missing**: `components/layout/app-shell.tsx`
   renders `<VehiclePicker>` only inside the desktop-only
   `hidden w-60 ... md:flex` sidebar. A mobile bottom-sheet variant,
   `components/layout/vehicle-picker-sheet.tsx`, already exists and works
   correctly but is only reachable via the FAB menu
   (`components/layout/fab.tsx`), not a visible switcher.
2. **Switch doesn't preserve/redirect panel**: `vehicle-picker.tsx` and
   `vehicle-picker-sheet.tsx` only call `setActiveVehicleId(id)`, never
   `navigate(...)`. Routes are vehicle-scoped by URL param
   (`routes/_authenticated/vehicles/$vehicleId/{panel}/index.tsx`), so
   switching the active vehicle leaves the URL/content pinned to the old
   vehicle. `features/vehicles/vehicle-usage.ts` already exports
   `supportsFuelLogs`/`supportsCharging`, used the same way in
   `components/layout/nav.tsx` to decide which panels the current vehicle
   supports.
3. **StatStrip breaks on mobile**: `components/StatStrip.tsx` builds
   `grid-template-columns: repeat(N, minmax(0,1fr))` with no responsive
   breakpoint. With 5 stats (`features/activity/components/vehicle-panel.tsx`)
   this squeezes into unreadably narrow columns on phone widths — the
   reported screenshot.
4. **Unlabeled trend text**: `panel.trendFlat` /
   `panel.trendUp` / `panel.trendDown` keys in `locales/{pl,en}/activity.json`
   are rendered alone by `formatTrend()` in
   `features/activity/components/vehicle-panel.tsx`, with no leading label
   naming what's being compared (the month's cost total).
5. **Wrong input type for long text**: `components/form/TextareaField.tsx`
   already exists and is used correctly for `description` in
   `features/service/components/service-form.tsx`. The same field uses a
   single-line `TextField` in `features/issues/components/issue-form.tsx` and
   `features/reminders/components/reminder-form.tsx`.

## Contract

n/a — no API/schema/route changes. Web-only UI/UX fixes reusing existing
components (`VehiclePickerSheet`, `TextareaField`, `supportsFuelLogs`/
`supportsCharging`).

### Endpoints / routes

n/a

### Request / response shapes

n/a

### Provides

n/a

### Consumes

- `features/vehicles/vehicle-usage.ts`: `supportsFuelLogs`, `supportsCharging`
  (existing, used to pick the fallback panel on vehicle switch).

## Acceptance criteria

- [ ] On a mobile viewport, a visible control lets the user open the vehicle
      switcher and change the active vehicle (not only via the FAB submenu).
- [ ] Switching the active vehicle while on a vehicle sub-panel
      (fuel/service/charging/etc.) navigates to the same sub-panel for the
      newly selected vehicle if it supports that panel, otherwise falls back
      to the vehicle overview panel.
- [ ] `StatStrip` no longer squeezes into unreadably narrow columns at mobile
      widths (e.g. wraps to 2-3 columns per row below a breakpoint) for the
      5-stat vehicle panel usage.
- [ ] The trend text under the vehicle panel's month-cost stat is prefixed
      with a label identifying what it compares (the month's cost), in both
      `pl` and `en`.
- [ ] `issue-form.tsx` and `reminder-form.tsx` description fields use
      `TextareaField` instead of `TextField`, matching `service-form.tsx`.

## Test matrix

| Case                                                          | Input                                     | Expected                                          |
| -------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| Switch vehicle while on `/vehicles/A/charging`, B supports charging | select vehicle B from switcher            | navigates to `/vehicles/B/charging`               |
| Switch vehicle while on `/vehicles/A/charging`, B is combustion-only | select vehicle B from switcher            | navigates to `/vehicles/B` (overview)             |
| StatStrip with 5 stats at 360px viewport                       | render `vehicle-panel.tsx`                | stats wrap to multiple rows, no column overflow    |
| Trend flat case                                                 | `prevTotal === total`                     | text includes a label plus "tyle co poprzednio" / "same as last month" |

## Files to touch

- `apps/web/src/components/layout/app-shell.tsx`
- `apps/web/src/components/layout/vehicle-picker.tsx`
- `apps/web/src/components/layout/vehicle-picker-sheet.tsx`
- `apps/web/src/components/layout/bottom-nav.tsx`
- `apps/web/src/components/StatStrip.tsx`
- `apps/web/src/features/activity/components/vehicle-panel.tsx`
- `apps/web/src/locales/pl/activity.json`, `apps/web/src/locales/en/activity.json`
- `apps/web/src/features/issues/components/issue-form.tsx`
- `apps/web/src/features/reminders/components/reminder-form.tsx`

## Out of scope

- Any redesign of the vehicle switcher's visual style beyond making it
  reachable on mobile.
- The mileage-reading "note" field in `vehicle-detail-hub.tsx` (genuinely
  short text; left as `TextField`).

## Implementation notes

_Running journal — update as work progresses._

## Verification

- `pnpm --filter @carnotea/web typecheck`
- `pnpm --filter @carnotea/web lint`
- `pnpm --filter @carnotea/web test`
- Manual verification in `agent-browser` at a mobile viewport width: switch
  vehicle from a sub-panel, confirm redirect/fallback; check StatStrip
  wrapping; check trend label; check textarea fields.

## References

- Related tickets: T-074, T-077
