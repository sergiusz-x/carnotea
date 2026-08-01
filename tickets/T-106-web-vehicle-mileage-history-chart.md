---
id: T-106
title: Web — vehicle mileage history chart
status: backlog
priority: medium
size: M # S = <half a day · one seam · M = one PR · L = split it (see Definition of Ready)
spec_version: 1 # bump when you change the contract after work has started
owner: ~
dependencies: []
labels: [web, analytics, mileage]
created_at: 2026-08-01
updated_at: 2026-08-01
closed_at: ~
---

# T-106 — Web — vehicle mileage history chart

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Let a vehicle owner understand how their car's recorded mileage changes over time through a polished, accessible chart.

## Context

Mileage readings already form part of a vehicle diary, but the raw values do not make the vehicle's usage pattern easy to scan. The chart should turn those readings into a visually clear history while preserving the existing instrument-cluster visual language.

## Contract

The vehicle detail experience gains a mileage-history visualization based solely on the current user's recorded mileage readings for the selected vehicle.

### Endpoints / routes

| Method | Path | Auth | Success | Errors |
| ------ | ---- | ---- | ------- | ------ |
| _n/a_ | Existing vehicle-detail route | session | Rendered chart | Existing loading/error states |

### Request / response shapes

Consume the existing mileage-reading shape for the active vehicle. Add a narrow, response-only chart-series schema only if the current client data cannot supply dated readings without overfetching.

### Provides

A reusable vehicle-mileage-history chart component that renders dated odometer readings as an ascending time-series line chart.

### Consumes

The existing authenticated vehicle-detail data and mileage-reading records introduced by T-021 and surfaced by the vehicle UI.

## Acceptance criteria

- [ ] On a vehicle view with two or more dated mileage readings, a responsive line chart displays odometer value on the vertical axis and reading date on the horizontal axis.
- [ ] Chart points are sorted chronologically and expose the exact localized date and formatted mileage value through a tooltip or equivalent accessible interaction.
- [ ] The component has explicit, localized empty and insufficient-data states and does not render a misleading trend from fewer than two readings.
- [ ] The chart meets the existing visual system, supports narrow mobile layouts, and has a text alternative or accessible summary for screen-reader users.
- [ ] Every new user-facing string is present in both Polish and English translations.

## Test matrix

| Case | Input | Expected |
| ---- | ----- | -------- |
| Chronological series | Readings submitted out of date order | Points and line render in ascending date order |
| Exact point detail | Keyboard-focus or hover a point | Localized date and mileage are available |
| Insufficient history | Zero or one reading | Localized empty/insufficient-data state, no trend line |
| Mobile viewport | Narrow viewport | Chart remains legible and usable without horizontal page overflow |
| Accessibility | Screen-reader semantics | Chart has a meaningful localized text alternative/summary |

## Files to touch

- `apps/web/src/`
- `apps/web/src/locales/`
- `apps/web/src/**/__tests__/`
- `packages/shared/src/` _only if a chart-specific response schema is required_

## Out of scope

- Forecasting future mileage or fuel consumption.
- Editing or importing mileage readings from the chart.
- Cross-vehicle comparison.

## Implementation notes

Choose a chart implementation that fits the existing dependency and design system; do not add a dependency until its compatible current version has been verified and the required architecture approval has been obtained. Keep units and number/date formatting aligned with the user's locale/settings.

## Verification

- `pnpm --filter @carnotea/web test` → chart cases pass
- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm --filter @carnotea/web dev` plus agent-browser checks at desktop and narrow mobile widths → chart and states are visually verified

## References

- Related tickets: T-021, T-033, T-068, T-077
- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
