---
id: T-027
title: Reminders CRUD with date/mileage triggers and status transitions
status: done
priority: medium
size: M
spec_version: 1
owner: claude-code
dependencies: [T-020]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: 2026-06-21
---

# T-027 — Reminders CRUD with date/mileage triggers and status transitions

## Goal

Expose vehicle-scoped reminder endpoints with statuses from
`REMINDER_STATUS_CODES`, supporting due-date and/or due-mileage targets and a
computed "due" state so the UI can surface upcoming and overdue maintenance.

## Context

`reminders` is keyed to a vehicle with a `statusId` FK to `reminder_statuses`
(`pending | done | cancelled`), a nullable `dueDate` and nullable `dueMileage`,
plus a DB check that at least one target is set
(`reminders_due_target_chk`). With vehicle CRUD landed (T-020), reminders are the
next standalone feature and a dependency for the dashboard's "upcoming reminders"
panel (T-028).

Follows [`patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md).

## Contract

### Endpoints

| Method | Path                                       | Auth    | Success          | Errors                                   |
| ------ | ------------------------------------------ | ------- | ---------------- | ---------------------------------------- |
| GET    | `/api/vehicles/{vehicleId}/reminders`      | session | 200 `Reminder[]` | 401, 404 NOT_FOUND                       |
| POST   | `/api/vehicles/{vehicleId}/reminders`      | session | 201 `Reminder`   | 400 VALIDATION_ERROR, 401, 404 NOT_FOUND |
| GET    | `/api/vehicles/{vehicleId}/reminders/{id}` | session | 200 `Reminder`   | 401, 404 NOT_FOUND                       |
| PATCH  | `/api/vehicles/{vehicleId}/reminders/{id}` | session | 200 `Reminder`   | 400, 401, 404 NOT_FOUND                  |
| DELETE | `/api/vehicles/{vehicleId}/reminders/{id}` | session | 204              | 401, 404 NOT_FOUND                       |

GET list supports `?status=` and `?dueState=` filters.

### Request / response shapes

- `ReminderSchema`, `ReminderCreateSchema`, `ReminderUpdateSchema` in
  `@carnotea/shared` (`reminder.ts`, exists). Create: `title` (≤160), optional
  `description`, **at least one** of `dueDate` / `dueMileage` (`>= 0`), via a Zod
  `refine` mirroring `reminders_due_target_chk` → **400 VALIDATION_ERROR**.
- `status` is a code; new reminders default to `pending`. `notifiedAt` is **not**
  client-writable.
- Response adds a derived `dueState` ∈ `overdue | due_soon | ok`, computed from
  `dueDate` vs today and `dueMileage` vs the vehicle's `currentMileage`. The
  `due_soon` thresholds are a named constant in `@carnotea/shared` (e.g. 14 days /
  500 km) — no inline magic numbers, so web reuses it.

### Provides

- The `dueState` helper + threshold constant in `@carnotea/shared`, consumed by
  T-028 (dashboard) and T-039 (web reminders).

### Consumes

- Vehicle ownership + `currentMileage` (T-020); lookup resolver shape (T-020).

## Acceptance criteria

- [ ] CRUD scoped to the authenticated user's vehicles (404 on another user's row).
- [ ] Create/update validate via the shared Zod schema through `zodRoute()`: `title`
      required, optional `description`, at least one of `dueDate`/`dueMileage`
      (`dueMileage >= 0`) — rejected with **400 VALIDATION_ERROR** before the DB.
- [ ] `status` accepts `REMINDER_STATUS_CODES`, resolved to `statusId`; new
      reminders default to `pending`.
- [ ] Status transitions validated: `pending → done | cancelled`; terminal statuses
      (`done`/`cancelled`) cannot go back to `pending` (clear 400).
- [ ] List responses include `dueState` and support `status`/`dueState` filters.
- [ ] Marking `done`/`cancelled` stamps `updatedAt`; `notifiedAt` is system-only.

## Test matrix

Inherits the baseline matrix, plus:

| Case                           | Input                              | Expected             |
| ------------------------------ | ---------------------------------- | -------------------- |
| no target rejected             | neither `dueDate` nor `dueMileage` | 400 VALIDATION_ERROR |
| negative due mileage           | `dueMileage: -1`                   | 400 VALIDATION_ERROR |
| default status                 | create without `status`            | `pending`            |
| illegal transition             | `done → pending`                   | 400 VALIDATION_ERROR |
| dueState overdue               | `dueDate` in the past, `pending`   | `dueState=overdue`   |
| dueState by mileage            | `dueMileage` ≤ `currentMileage`    | `dueState=overdue`   |
| notifiedAt not client-writable | body sets `notifiedAt`             | ignored / 400        |
| cross-user isolation           | another user's `vehicleId`         | 404 NOT_FOUND        |

## Files to touch

- `apps/api/src/reminders/` (controller, service, module)
- `apps/api/src/reminders/*.test.ts` (co-located; **no** `apps/api/test/*.e2e-spec.ts`)
- `packages/shared/src/schemas/reminder.ts` (+ `due_soon` threshold constant)

## Out of scope

- Actually **sending** notifications / emails / push (only the data model and
  `dueState`; delivery + `notifiedAt` writes are T-055).
- Recurring reminders (auto-recreate on completion).
- The dashboard "upcoming reminders" aggregation (T-028 consumes this API).

## Implementation notes

- Keep the "at least one target" rule in the shared Zod schema with a `.refine()`
  so both api and web reject it identically before the DB check.
- Resolve `reminder_statuses` ids once (cache the code→id map) rather than joining
  the lookup table on every write.

## Verification

- `pnpm --filter @carnotea/api test reminders` → all pass
- `curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(contains("reminders"))'` → all 5 routes present

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Schema: `packages/db/src/schema/reminders.ts`, `lookup-tables.ts`
  (`reminderStatuses`); constants:
  `packages/shared/src/constants/reminder-statuses.ts`;
  `packages/shared/src/schemas/reminder.ts`
- Related tickets: T-020 (vehicles, provides `currentMileage`), T-028, T-055
