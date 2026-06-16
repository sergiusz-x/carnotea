---
id: T-039
title: Web reminder screens with due/mileage triggers and status
status: ready
priority: medium
owner: ~
dependencies: [T-033, T-027]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-039 — Web reminder screens with due/mileage triggers and status

## Goal

Let a user view, add, edit, complete, and delete reminders for a vehicle, with
due-date and/or due-mileage triggers and a lifecycle status, all driven by
TanStack Query against the typed client.

## Context

Reminders are the "don't forget" log: an upcoming task triggered by a date, a
mileage threshold, or both, with a status that moves from pending to done or
cancelled. They hang off the vehicle hub (T-033), feed the dashboard's "upcoming"
list (T-040), and consume the API from T-027.

## Acceptance criteria

- [ ] `/vehicles/:vehicleId/reminders` lists reminders (title, due date, due
      mileage, status) with loading, empty, and error states; can filter by
      status and highlights items that are overdue against today / current
      mileage.
- [ ] Status renders as a translated badge from `REMINDER_STATUS_CODES`
      (pending, done, cancelled).
- [ ] A detail view shows the full reminder including description and both
      triggers.
- [ ] Create and edit use the T-031 form stack with the shared Zod reminder
      schema: title, description, dueDate, dueMileage, statusId; the UI enforces
      that at least one of dueDate/dueMileage is set (mirrors the server check).
- [ ] A "mark done" action moves status to `done` without a full edit.
- [ ] Delete asks for confirmation.
- [ ] All reads/writes go through TanStack Query + the typed client; mutations
      invalidate the reminder list and the dashboard's upcoming-reminders query.
- [ ] Every user-facing string exists in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, filter, create, mark done, delete). If
      Chrome is blocked, fall back to documented structural verification and note it.

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/reminders/**`
- `apps/web/src/features/reminders/**` (components, hooks, query options)
- `apps/web/src/locales/pl/reminders.json`, `apps/web/src/locales/en/reminders.json`

## Out of scope

- API work for reminders (T-027) — typed client consumed as-is.
- Push/email notification delivery (`notifiedAt` is server-owned; display only).
- The dashboard's upcoming-reminders widget itself (T-040 renders it).

## Implementation notes

- Compute overdue state from today's date and the vehicle's `currentMileage`
  against `dueDate`/`dueMileage`; treat either trigger crossing as overdue.
- Enforce "at least one trigger" client-side as a friendly check and let the
  API's `due_target_chk` be authoritative.

## References

- Related tickets: T-033 (vehicle hub), T-027 (API reminders), T-031 (forms),
  T-011 (typed client), T-040 (dashboard upcoming reminders)
- Schema: `packages/db/src/schema/reminders.ts`
- Constants: `packages/shared/src/constants/reminder-statuses.ts`
