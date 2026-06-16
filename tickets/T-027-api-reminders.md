---
id: T-027
title: Reminders CRUD with date/mileage triggers and status transitions
status: ready
priority: medium
owner: ~
dependencies: [T-020]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-027 — Reminders CRUD with date/mileage triggers and status transitions

## Goal

Expose user-scoped reminder endpoints with statuses from
`REMINDER_STATUS_CODES`, supporting due-date and/or due-mileage targets and a
computed "due" state so the UI can surface upcoming and overdue maintenance.

## Context

The `reminders` table is keyed to a vehicle with a `statusId` FK to
`reminder_statuses` (`pending | done | cancelled`), a nullable `dueDate` and
nullable `dueMileage`, plus a DB check that at least one target is set. With
vehicle CRUD landed (T-020), reminders are the next standalone feature and a
dependency for the dashboard's "upcoming reminders" panel (T-028).

## Acceptance criteria

- [ ] `GET/POST /vehicles/:vehicleId/reminders`, `GET/PATCH/DELETE
/reminders/:id`, scoped to the authenticated user's vehicles (404 on
      another user's row).
- [ ] Create/update validate via a shared Zod schema through `zodRoute()`:
      `title` required (<=160), optional `description`, and **at least one** of
      `dueDate` / `dueMileage` (`dueMileage >= 0`) — mirroring the
      `reminders_due_target_chk` constraint, rejected with a 422 before hitting
      the DB.
- [ ] `statusCode` accepts `REMINDER_STATUS_CODES`, resolved to `statusId`
      server-side; new reminders default to `pending`.
- [ ] Status transitions are validated: from `pending` to `done` or `cancelled`;
      terminal statuses (`done` / `cancelled`, per `isTerminal`) cannot transition
      back to `pending` (rejected with a clear error).
- [ ] List responses include a derived `dueState` (`overdue` | `due_soon` | `ok`)
      computed from `dueDate` vs today and `dueMileage` vs the vehicle's
      `currentMileage`; supports filtering by `statusCode` and `dueState`.
- [ ] Marking a reminder `done`/`cancelled` stamps `updatedAt`; `notifiedAt` is
      writable only by the system (not user input).
- [ ] Zod schemas live in `@carnotea/shared`; types via `z.infer`.

## Files to touch

- `apps/api/src/reminders/` (controller, service, module)
- `packages/shared/src/schemas/reminder.ts`
- `apps/api/test/reminders.e2e-spec.ts`

## Out of scope

- Actually **sending** notifications / emails / push (only the data model and
  `dueState`; delivery + `notifiedAt` writes are a later ticket).
- Recurring reminders (auto-recreate on completion).
- The dashboard "upcoming reminders" aggregation (T-028 consumes this API).

## Implementation notes

- Keep the "at least one target" rule in the shared Zod schema with a
  `.refine()` so both api and web reject it identically before the DB check.
- `due_soon` threshold (e.g. 14 days / 500 km) — define as a named constant in
  `@carnotea/shared`, not inline magic numbers, so web can reuse it.
- Resolve `reminder_statuses` ids once (cache the code→id map) rather than
  joining the lookup table on every write.

## References

- Schema: `packages/db/src/schema/reminders.ts`,
  `lookup-tables.ts` (`reminderStatuses`)
- Constants: `packages/shared/src/constants/reminder-statuses.ts`
- Related tickets: T-020 (vehicles, provides `currentMileage`), T-028
