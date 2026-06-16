---
id: T-040
title: Web home dashboard with cost, consumption, reminders, activity
status: ready
priority: medium
owner: ~
dependencies: [T-033, T-028]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-040 — Web home dashboard with cost, consumption, reminders, activity

## Goal

Build the home/dashboard screen that summarizes a vehicle (or the whole garage):
cost breakdown, consumption/energy stats, upcoming reminders, and recent
activity, all sourced from the dashboard API (T-028) via TanStack Query.

## Context

Once the per-vehicle logs exist (T-033–T-039), users need a single glance view of
where money goes and what's coming up. The dashboard aggregates data the API has
already computed (T-028) rather than recomputing client-side, so this ticket is
mostly presentation: it reads the aggregate endpoint and renders cards/sections.

## Acceptance criteria

- [ ] A dashboard route (home `/` and/or `/vehicles/:vehicleId` summary) reads
      the T-028 aggregate endpoint via TanStack Query with loading, empty, and
      error states.
- [ ] Cost breakdown section shows totals by expense category (fuel, electricity,
      service, parts, insurance, inspection, other) with translated labels.
- [ ] Consumption/energy stats section shows fuel consumption and/or EV energy
      metrics as returned by the API (e.g. avg L/100km, kWh/100km, cost/km),
      formatted with the vehicle's units and currency.
- [ ] Upcoming reminders section lists the next due/overdue reminders with status
      badges and links to the reminders area.
- [ ] Recent activity section lists the latest log entries (fuel, charging,
      service, issues, expenses) with links to their detail.
- [ ] Empty/new-vehicle state guides the user to add their first log; all
      sections degrade gracefully when their data is empty.
- [ ] Every user-facing string exists in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (each section renders; empty and populated
      states). If Chrome is blocked, fall back to documented structural
      verification and note it.

## Files to touch

- `apps/web/src/routes/index.tsx` and/or the vehicle summary route
- `apps/web/src/features/dashboard/**` (cards, sections, hooks, query options)
- `apps/web/src/locales/pl/dashboard.json`, `apps/web/src/locales/en/dashboard.json`

## Out of scope

- API/aggregation work (T-028) — consume the computed aggregates as-is; do not
  recompute stats client-side.
- Authoring logs/reminders from the dashboard — link out to the owning areas
  (T-034–T-039).
- Charting library decisions beyond what the existing UI kit provides — keep
  visuals simple (numbers, bars) unless an ADR already covers charts.

## Implementation notes

- Treat the dashboard query as read-only and cache it with a modest `staleTime`;
  refetch on window focus so it stays current after edits in other areas.
- Reuse the category, status, and unit/currency formatting helpers from the log
  tickets so labels stay consistent.
- If the API returns per-vehicle aggregates, key the query by `vehicleId`.

## References

- Related tickets: T-033 (vehicle hub), T-028 (API dashboard), T-011 (typed
  client), T-038/T-039 (categories, reminders surfaced here)
