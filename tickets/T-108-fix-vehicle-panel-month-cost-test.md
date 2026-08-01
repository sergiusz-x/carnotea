---
id: T-108
title: Fix vehicle-panel monthly cost calculation test
status: in_review
priority: high
size: S # S = <half a day · one seam · M = one PR · L = split it (see Definition of Ready)
spec_version: 1 # bump when you change the contract after work has started
owner: codex
dependencies: []
labels: [api, bug, ci]
created_at: 2026-08-01
updated_at: 2026-08-01
closed_at: ~
---

# T-108 — Fix vehicle-panel monthly cost calculation test

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Make the vehicle-panel monthly-cost calculation deterministic and correct so API CI passes.

## Context

PR #164 CI exposes a failing integration test: the EV panel expects current- and previous-month costs of 80 and 30 EUR, but receives 0 and 80 EUR. The failure blocks required CI checks and prevents the planned tickets from merging.

## Contract

The existing `GET /api/vehicles/:vehicleId/panel` contract remains unchanged. Its monthly-cost fields must classify seeded expense/charging records according to the intended current and preceding calendar-month boundary used by the test fixture.

### Endpoints / routes

| Method | Path                             | Auth    | Success                          | Errors          |
| ------ | -------------------------------- | ------- | -------------------------------- | --------------- |
| GET    | `/api/vehicles/:vehicleId/panel` | session | Existing `VehiclePanel` response | Existing errors |

### Request / response shapes

No schema changes. Preserve the existing `VehiclePanelSchema` and its `monthCost` fields.

### Provides

A deterministic, passing integration test for the existing vehicle panel's monthly-cost vitals.

### Consumes

The existing activity/panel service, month-boundary helper(s), and API integration fixture.

## Acceptance criteria

- [x] The failing EV vehicle-panel integration case passes with the existing intended 80 EUR current-month and 30 EUR preceding-month totals.
- [x] The production calculation and test fixture use one explicit, deterministic definition of the reference date/month boundary.
- [x] The API response contract and user-visible vehicle-panel behaviour are unchanged except for correcting the month-cost values.
- [x] `pnpm --filter @carnotea/api test` passes.

## Test matrix

| Case                  | Input                                                        | Expected                                  |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| Current month         | 80 EUR cost in the reference month                           | `monthCost.total` is 80                   |
| Previous month        | 30 EUR cost in the calendar month before the reference month | `monthCost.prevTotal` is 30               |
| Outside range         | Cost before the previous month                               | Excluded from both totals                 |
| Existing no-data case | Vehicle with no applicable cost data                         | Existing null/zero response remains valid |

## Files to touch

- `apps/api/src/activity/`
- `apps/api/src/**/**.test.ts`
- `tickets/INDEX.md`

## Out of scope

- Changing the public vehicle-panel response schema.
- Redesigning dashboard or activity-feed calculations.

## Implementation notes

The production date range was correct; the integration fixture used a fixed July 2026 date while the service used the wall clock. The suite now pins its system time to that fixture date and restores real timers after cleanup, making the month boundary deterministic.

## Verification

- `pnpm --filter @carnotea/api test` → all API tests pass
- `pnpm test` → all workspace tests pass
- `pnpm format:check`
- `pnpm lint:tickets`

## References

- Related tickets: T-070, T-071, T-072, T-073
- Failing CI: PR #164, `apps/api/src/activity/activity.integration.test.ts`
