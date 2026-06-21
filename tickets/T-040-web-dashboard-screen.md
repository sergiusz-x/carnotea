---
id: T-040
title: Web home dashboard with cost, consumption, reminders, activity
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-033, T-028]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-040 — Web home dashboard with cost, consumption, reminders, activity

## Goal

Build the home/dashboard screen that summarizes a vehicle (or the whole garage):
cost breakdown, consumption/energy stats, upcoming reminders, and recent activity,
all sourced from the dashboard API (T-028) via TanStack Query.

## Context

Once the per-vehicle logs exist (T-033–T-039), users need a single-glance view of
where money goes and what's coming up. The dashboard aggregates data the API has
already computed (T-028) rather than recomputing client-side, so this ticket is
mostly presentation: read the aggregate endpoints and render cards/sections.

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

## Contract

### Routes

| Route                        | Screen                    | Data                                                 |
| ---------------------------- | ------------------------- | ---------------------------------------------------- |
| `/`                          | account dashboard         | `overviewQueryOptions`, `recentActivityQueryOptions` |
| `/vehicles/$vehicleId` (hub) | per-vehicle summary cards | `vehicleSummaryQueryOptions(vehicleId)` etc.         |

The per-vehicle summary may render on the T-033 hub rather than a new route — pick
one and pin it; do not duplicate.

### Query keys

```
['analytics', 'overview']                               # account rollup
['analytics', 'recent-activity', { page }]              # feed
['analytics', vehicleId, 'summary', { from, to }]       # spend summary
['analytics', vehicleId, 'consumption']                 # consumption stats
['analytics', vehicleId, 'upcoming-reminders']          # upcoming list
```

### Request / response shapes

- Consume the T-028 shared schemas (`VehicleSpendSummary`, `ConsumptionStats`,
  `AccountOverview`, `ActivityFeed`, `Reminder[]`) read-only. No new write schemas.

### Provides

- _n/a_ (read-only presentation).

### Consumes

- `apiClient.GET` (T-011), the analytics API (T-028), the app shell (T-032), and the
  category/status/unit formatting helpers from the log tickets.

## Acceptance criteria

- [ ] The dashboard reads the T-028 aggregate endpoints via TanStack Query with
      loading, empty, and error states.
- [ ] Cost breakdown section shows totals by expense category with translated labels.
- [ ] Consumption/energy section shows metrics as returned (avg L/100km, kWh/100km,
      cost/km), formatted with the vehicle's units and currency.
- [ ] Upcoming reminders section lists next due/overdue reminders with status badges
      and links to the reminders area.
- [ ] Recent activity section lists the latest entries (fuel/charge/service/issues/
      expenses) with links to their detail.
- [ ] Empty/new-vehicle state guides the user to add their first log; all sections
      degrade gracefully when their data is empty.
- [ ] Every string in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (each section renders; empty and populated states);
      fallback noted.

## Test matrix

Inherits the screens baseline (loading/empty/error/i18n), plus:

| Case                          | Expected                                   |
| ----------------------------- | ------------------------------------------ |
| cost section labels           | category totals with translated labels     |
| consumption formatting        | metrics use the vehicle's units + currency |
| upcoming reminders links      | items link to the reminders area           |
| recent activity discriminator | each item routes to its kind's detail      |
| new-vehicle empty state       | guides to add a first log; no errors       |

## Files to touch

- `apps/web/src/routes/index.tsx` and/or the vehicle summary on the T-033 hub
- `apps/web/src/features/dashboard/**`
- `apps/web/src/locales/{pl,en}/dashboard.json`

## Out of scope

- API/aggregation work (T-028) — consume aggregates as-is; do not recompute stats.
- Authoring logs/reminders from the dashboard — link out to the owning areas.
- A charting library beyond the existing UI kit — keep visuals simple (numbers, bars)
  unless an ADR covers charts.

## Implementation notes

- Treat dashboard queries as read-only with a modest `staleTime`; refetch on window
  focus so it stays current after edits elsewhere.
- Reuse category/status/unit/currency formatting helpers from the log tickets so
  labels stay consistent.
- Key per-vehicle queries by `vehicleId`.

## Verification

- `pnpm --filter @carnotea/web test dashboard` → all pass
- `pnpm --filter @carnotea/web dev` → agent-browser shows each section in empty + populated states
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-033, T-028 (analytics API), T-011, T-038/T-039
