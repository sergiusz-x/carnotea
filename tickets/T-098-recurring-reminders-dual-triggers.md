---
id: T-098
title: Add recurring reminders with dual time and mileage triggers
status: in_progress
priority: high
size: M
spec_version: 1
owner: codex
dependencies: [T-027, T-028, T-039, T-040, T-070, T-071, T-073]
labels: [api, web, db, shared, reminders, dashboard, activity, bug]
created_at: 2026-07-12
updated_at: 2026-07-12
closed_at: ~
---

# T-098 — Add recurring reminders with dual time and mileage triggers

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Allow reminders such as oil changes to recur by mileage and/or by elapsed time,
and always surface the next reminder based on whichever trigger happens sooner.

## Context

The existing reminder model only supports one-off due dates and due mileage.
That is not sufficient for maintenance items that repeat, such as "every
10 000 km or every 12 months since the last service". The app also needs a
single urgency model so reminders, dashboard cards, and activity views can sort
by the nearest upcoming trigger regardless of whether the next threshold is time
or mileage.

## Contract

The reminders domain supports two modes:

- `one_off` keeps the current due-date / due-mileage behavior.
- `recurring` stores mileage interval and/or month interval together with the
  last performed date and last performed mileage, and derives `nextDueDate`
  and `nextDueMileage`.

The API and web UI must expose these fields consistently across reminder list,
reminder detail, dashboard upcoming reminders, activity feed entries, and
account export payloads.

### Endpoints / routes

| Method | Path                         | Auth    | Success                   | Errors                  |
| ------ | ---------------------------- | ------- | ------------------------- | ----------------------- |
| GET    | `/api/reminders`             | session | 200 `Reminder[]`          | existing auth / 404     |
| POST   | `/api/reminders`             | session | 201 `Reminder`            | 400 `VALIDATION_ERROR`  |
| PATCH  | `/api/reminders/:id`         | session | 200 `Reminder`            | 400 / 404               |
| GET    | `/api/dashboard`             | session | 200 dashboard payload     | existing auth / 404     |
| GET    | `/api/vehicles/:id/activity` | session | 200 activity items        | existing auth / 404     |
| GET    | `/_authenticated/reminders`  | session | recurring reminder UI     | existing web auth flows |
| GET    | `/_authenticated/dashboard`  | session | sorted upcoming reminders | existing web auth flows |

### Request / response shapes

- Update `ReminderSchema`, `ReminderCreateSchema`, and `ReminderUpdateSchema`
  in `@carnotea/shared` with `mode`, recurrence interval fields, last performed
  fields, and computed `nextDueDate` / `nextDueMileage`.
- Update the shared dashboard and activity reminder projections so they carry
  the same recurring metadata.
- Mirror the persisted reminder shape in `packages/db/src/schema/reminders.ts`
  and a generated migration.

### Provides

- A single reminder urgency computation that compares next due date and next due
  mileage and ranks whichever threshold is closer.
- Recurring reminder CRUD contracts and UI inputs for time-based, mileage-based,
  or dual-trigger maintenance schedules.

### Consumes

- Existing reminders CRUD endpoints and UI screens from T-027 and T-039.
- Existing dashboard / activity feed projections from T-028, T-040, T-070,
  T-071, and T-073.

## Acceptance criteria

- [x] Reminder create and update flows support `one_off` and `recurring` modes,
      and recurring reminders require at least one interval plus the matching
      last-performed baseline needed to compute the next due trigger.
- [x] Reminder API responses include computed `nextDueDate` and/or
      `nextDueMileage` for recurring reminders, while preserving one-off
      reminder behavior.
- [x] Dashboard upcoming reminders and activity reminder entries sort by the
      nearest upcoming trigger, using whichever of time or mileage is due
      sooner.
- [x] The reminders UI lets the user enter recurring cadence and last-performed
      data, and shows the next due trigger in list/detail/dashboard surfaces.
- [x] Database schema and generated migration persist reminder recurrence mode,
      cadence, and last-performed fields without hand-editing generated files.

## Test matrix

| Case                          | Input                                              | Expected                                               |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| recurring by mileage only     | interval km + last mileage                         | next due mileage computed, no next due date            |
| recurring by time only        | interval months + last date                        | next due date computed, no next due mileage            |
| recurring by both             | interval km + months + both baselines              | both next due fields computed, earlier one drives sort |
| invalid recurring baseline    | interval set without matching last performed value | 400 `VALIDATION_ERROR`                                 |
| dashboard urgency ordering    | reminders with mixed date / mileage thresholds     | nearest trigger appears first                          |
| web recurring form submission | create recurring reminder from UI                  | reminder saves and rendered next due info updates      |

## Files to touch

- `packages/shared/src/helpers/due-state.ts`
- `packages/shared/src/schemas/{reminder,dashboard,activity}.ts`
- `packages/db/src/schema/reminders.ts`
- `packages/db/migrations/*`
- `apps/api/src/reminders/*`
- `apps/api/src/dashboard/*`
- `apps/api/src/activity/*`
- `apps/api/src/account/account.controller.ts`
- `apps/web/src/features/reminders/components/*`
- `apps/web/src/features/dashboard/components/upcoming-reminders.tsx`
- `apps/web/src/locales/{pl,en}/{reminders,dashboard}.json`

## Out of scope

- Actual push notifications or scheduled background reminder delivery.
- Automatic vehicle-mileage prediction for future reminder dates.
- New reminder categories beyond the recurrence model.

## Implementation notes

- Compute derived next-due fields centrally so reminders, dashboard, activity,
  and exports all use the same urgency logic.
- For dual-trigger recurring reminders, whichever trigger is closer must decide
  overdue / due soon state and list ordering.
- This ticket was recreated after a local reset removed the earlier untracked
  ticket draft; the implementation in the working tree is the source of truth.

## Verification

- `pnpm --filter @carnotea/db db:generate` → migration generated from schema
- `pnpm --filter @carnotea/api typecheck` → pass
- `pnpm --filter @carnotea/web typecheck` → pass
- `pnpm --filter @carnotea/api test -- src/reminders/reminders.controller.test.ts src/dashboard/dashboard.controller.test.ts src/activity/activity.controller.test.ts` → pass
- `pnpm --filter @carnotea/web dev` + browser verification of reminders form/list/detail/dashboard → pass

## References

- Related tickets: T-027, T-028, T-039, T-040, T-070, T-071, T-073
- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md), [web-screens](../docs/agents/patterns/web-screens.md)
- Schema: `packages/db/src/schema/reminders.ts`, `packages/shared/src/schemas/reminder.ts`
