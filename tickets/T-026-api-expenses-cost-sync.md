---
id: T-026
title: Expenses CRUD + automatic cost sync from fuel/charge/service
status: ready
priority: medium
size: L
spec_version: 1
owner: ~
dependencies: [T-022, T-023, T-024]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-026 — Expenses CRUD + automatic cost sync from fuel/charge/service

## Goal

Expose vehicle-scoped expense endpoints with categories from
`EXPENSE_CATEGORY_CODES`, and keep an expense row automatically in sync for every
fuel log, charging session, and service record so the `expenses` table is the
single source of truth for vehicle totals.

## Context

The `expenses` table carries `sourceType`
(`fuel_log | charging_session | service_record | manual | other`) and a nullable
`sourceId`, with a partial unique index over `(sourceType, sourceId)` for
non-`manual` rows. That schema exists precisely so cost-bearing entries
(T-022/T-023/T-024) project into one normalized ledger instead of every analytics
query summing four tables. This ticket makes that projection real and owns the
manual-expense API on top of it.

`size: L` — it adds a resource **and** wires sync hooks into three existing
services. Follows
[`patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md).

## Contract

### Endpoints

| Method | Path                                  | Auth    | Success         | Errors                                   |
| ------ | ------------------------------------- | ------- | --------------- | ---------------------------------------- |
| GET    | `/vehicles/{vehicleId}/expenses`      | session | 200 `Expense[]` | 401, 404 NOT_FOUND                       |
| POST   | `/vehicles/{vehicleId}/expenses`      | session | 201 `Expense`   | 400 VALIDATION_ERROR, 401, 404 NOT_FOUND |
| GET    | `/vehicles/{vehicleId}/expenses/{id}` | session | 200 `Expense`   | 401, 404 NOT_FOUND                       |
| PATCH  | `/vehicles/{vehicleId}/expenses/{id}` | session | 200 `Expense`   | 400, 401, 404, 409 CONFLICT              |
| DELETE | `/vehicles/{vehicleId}/expenses/{id}` | session | 204             | 401, 404, 409 CONFLICT                   |

List newest-first on `expenseDate`. PATCH/DELETE on an auto-synced row (`sourceType
<> 'manual'`) returns **409 CONFLICT** (`code: CONFLICT`, message: edit the source
entry). GET list supports `?source=` filter (`manual` or a specific source type).

### Request / response shapes

- `ExpenseSchema`, `ExpenseCreateSchema`, `ExpenseUpdateSchema`,
  `ExpenseListQuery` in `@carnotea/shared` (`expense.ts`, exists). Create accepts
  `categoryCode` (from `EXPENSE_CATEGORY_CODES`), resolved to `categoryId`;
  `amount >= 0`; `expenseDate`; optional `description`.
- Response carries `sourceType` and a read-only `isAutoSynced` boolean so the UI
  can disable editing.

### Provides

- `CostSyncService.upsertFromSource(tx, { vehicleId, sourceType, sourceId, amount, date, categoryCode })`
  and `CostSyncService.removeForSource(tx, { sourceType, sourceId })` — the frozen
  seam each domain service calls inside its own transaction. Category mapping:
  `fuel_log → fuel`, `charging_session → electricity`, `service_record → service`.

### Consumes

- Vehicle ownership (T-020).
- The fuel-log / charging-session / service-record services (T-022/T-023/T-024) —
  this ticket edits them to call `CostSyncService` on every mutation.

## Acceptance criteria

- [ ] CRUD endpoints scoped to the authenticated user's vehicles (404, not 403, on
      another user's row).
- [ ] Create/update accept a `categoryCode` resolved to `categoryId` server-side;
      `amount` validated `>= 0` with `numeric(10,2)` precision; bodies validated by
      a shared Zod schema via `zodRoute()`.
- [ ] Creating/updating/deleting a fuel log, charging session, or service record
      upserts/deletes a matching expense row keyed by `(sourceType, sourceId)` with
      `amount = totalCost`, `expenseDate = entry date`, category `fuel` /
      `electricity` / `service`.
- [ ] Auto-synced rows (`sourceType <> 'manual'`) are read-only through the expense
      write endpoints — PATCH/DELETE on them is rejected with 409.
- [ ] Listing returns both manual and auto-synced expenses; `?source=` filter works.
- [ ] Cost-sync runs in the same transaction as the source mutation, so a total is
      never double-counted or orphaned (verified by integration tests).

## Test matrix

Inherits the baseline matrix, plus:

| Case                          | Input                        | Expected                                         |
| ----------------------------- | ---------------------------- | ------------------------------------------------ |
| manual expense create         | valid `categoryCode`, amount | 201, row with `sourceType=manual`                |
| fuel log creates expense      | create a fuel log (T-022)    | expense row, `amount=totalCost`, category `fuel` |
| source edit updates expense   | edit the fuel log's cost     | expense `amount` follows                         |
| source delete removes expense | delete the fuel log          | expense row gone                                 |
| auto-synced row is read-only  | PATCH an auto-synced expense | 409 CONFLICT                                     |
| upsert idempotent             | re-sync same `(type,id)`     | one row                                          |
| unknown category code         | `categoryCode="nope"`        | 400 VALIDATION_ERROR                             |
| cross-user isolation          | another user's `vehicleId`   | 404 NOT_FOUND                                    |

## Files to touch

- `apps/api/src/expenses/` (controller, service, module)
- `apps/api/src/expenses/cost-sync.service.ts` (shared upsert/delete helper)
- `apps/api/src/fuel-logs/`, `apps/api/src/charging-sessions/`,
  `apps/api/src/service-records/` — hook the sync into their services
- `apps/api/src/expenses/*.test.ts` (co-located; **no** `apps/api/test/*.e2e-spec.ts`)
- `packages/shared/src/schemas/expense.ts`

## Out of scope

- Web expense screens (T-038).
- Currency conversion — expenses inherit the vehicle's `currencyCode` as-is.
- Recurring/scheduled expenses and budgets.
- Backfilling historical entries created before this ticket (one-off migration →
  new ticket if needed).

## Implementation notes

- One `CostSyncService.upsertFromSource(tx, ...)` so each domain service calls one
  method; deletion cascades via the source row's `onDelete: 'cascade'` FK, but the
  explicit helper keeps behaviour testable.
- Use `INSERT ... ON CONFLICT (source_type, source_id) DO UPDATE` to respect the
  partial unique index.
- Service records: `totalCost` already includes parts + labor (T-024), so sync the
  record's `totalCost`, not a recomputed sum.

## Verification

- `pnpm --filter @carnotea/api test expenses fuel-logs charging-sessions service-records` → all pass
- `curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(contains("expenses"))'` → all 5 routes present

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Schema: `packages/db/src/schema/expenses.ts`, `fuel-logs.ts`,
  `charging-sessions.ts`, `service-records.ts`; constants:
  `packages/shared/src/constants/expense-categories.ts`;
  `packages/shared/src/schemas/expense.ts`
- Related tickets: T-022, T-023, T-024, T-028 (analytics reads this ledger)
