---
id: T-039
title: Web reminder screens with due/mileage triggers and status
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-033, T-027]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-039 — Web reminder screens with due/mileage triggers and status

## Goal

Let a user view, add, edit, complete, and delete reminders for a vehicle, with
due-date and/or due-mileage triggers and a lifecycle status, all driven by TanStack
Query against the typed client.

## Context

Reminders are the "don't forget" log: an upcoming task triggered by a date, a mileage
threshold, or both, with a status that moves from pending to done or cancelled. They
hang off the vehicle hub (T-033), feed the dashboard's "upcoming" list (T-040), and
consume the API from T-027.

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

## Contract

### Routes

| Route                                     | Screen      | Data                                       |
| ----------------------------------------- | ----------- | ------------------------------------------ |
| `/vehicles/$vehicleId/reminders`          | list        | `remindersQueryOptions(vehicleId, filter)` |
| `/vehicles/$vehicleId/reminders/new`      | create form | —                                          |
| `/vehicles/$vehicleId/reminders/$id`      | detail      | `reminderQueryOptions(vehicleId, id)`      |
| `/vehicles/$vehicleId/reminders/$id/edit` | edit form   | same                                       |

### Query keys

```
['vehicles', vehicleId, 'reminders', { status?, dueState? }]   # filtered list
['vehicles', vehicleId, 'reminders', id]                       # one reminder
```

Mutations also invalidate the dashboard upcoming-reminders query
(`['analytics', vehicleId, 'upcoming-reminders']` or equivalent from T-040).

### Request / response shapes

- `ReminderSchema`, `ReminderCreateSchema`, `ReminderUpdateSchema` from
  `@carnotea/shared`. Form fields: `title`, `description`, `dueDate`, `dueMileage`,
  **`status` (code, from `REMINDER_STATUS_CODES` — not `statusId`)**. The response's
  `dueState` (`overdue | due_soon | ok`) drives badges; `notifiedAt` is display-only.

### Provides

- _n/a_

### Consumes

- `apiClient` write methods (T-033 seam), vehicle-scoped layout (T-033), forms
  (T-031), reminders API (T-027), the shared `dueState`/threshold constant (T-027).

## Acceptance criteria

- [ ] List shows reminders (title, due date, due mileage, status, `dueState`) with
      loading/empty/error; can filter by status and highlights overdue/due-soon items.
- [ ] Status renders as a translated badge from `REMINDER_STATUS_CODES`.
- [ ] Detail shows the full reminder including description and both triggers.
- [ ] Create/edit use the T-031 form stack; the UI enforces at least one of
      `dueDate`/`dueMileage` (mirrors the server check) and rejects illegal status
      transitions surfaced by the API.
- [ ] A "mark done" action moves status to `done` without a full edit.
- [ ] Delete asks for confirmation.
- [ ] All reads/writes via TanStack Query + typed client; mutations invalidate the
      reminder list and the dashboard upcoming-reminders query.
- [ ] Every string in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, filter, create, mark done, delete); fallback noted.

## Test matrix

Inherits the screens baseline, plus:

| Case                       | Expected                                           |
| -------------------------- | -------------------------------------------------- |
| at-least-one-trigger check | submitting with neither target shows a form error  |
| dueState badge             | overdue/due_soon items highlighted from `dueState` |
| mark done                  | "mark done" sets status `done` and refreshes list  |
| illegal transition error   | API rejection (e.g. done→pending) surfaces clearly |
| status filter              | filtering by status narrows the list               |

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/reminders/**`
- `apps/web/src/features/reminders/**`
- `apps/web/src/locales/{pl,en}/reminders.json`

## Out of scope

- API work for reminders (T-027) — typed client consumed as-is.
- Push/email notification delivery (`notifiedAt` is server-owned; display only) — T-055.
- The dashboard's upcoming-reminders widget itself (T-040 renders it).

## Implementation notes

- Use the shared `dueState` from the API response for highlighting; do not recompute
  thresholds client-side (reuse the T-027 constant if a local computation is needed).
- Enforce "at least one trigger" client-side as a friendly check; the API's
  `due_target_chk` stays authoritative.

## Verification

- `pnpm --filter @carnotea/web test reminders` → all pass
- `pnpm --filter @carnotea/web dev` → agent-browser exercises list/filter/create/mark-done/delete
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-033, T-027, T-031, T-011, T-040 (dashboard upcoming)
- Schema: `packages/db/src/schema/reminders.ts`; constants:
  `packages/shared/src/constants/reminder-statuses.ts`
