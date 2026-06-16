---
id: T-026
title: Expenses CRUD + automatic cost sync from fuel/charge/service
status: ready
priority: medium
owner: ~
dependencies: [T-022, T-023, T-024]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-026 — Expenses CRUD + automatic cost sync from fuel/charge/service

## Goal

Expose user-scoped expense endpoints with categories from
`EXPENSE_CATEGORY_CODES`, and keep an expense row automatically in sync for every
fuel log, charging session, and service record so the `expenses` table is the
single source of truth for vehicle totals.

## Context

The `expenses` table already carries `sourceType`
(`fuel_log | charging_session | service_record | manual | other`) and a nullable
`sourceId`, with a partial unique index over `(sourceType, sourceId)` for
non-`manual` rows. That schema exists precisely so cost-bearing entries
(T-022/T-023/T-024) project into one normalized ledger instead of every
analytics query summing four tables. This ticket makes that projection real and
owns the manual-expense API on top of it.

## Acceptance criteria

- [ ] `GET/POST /vehicles/:vehicleId/expenses`, `GET/PATCH/DELETE
/expenses/:id`, all scoped to the authenticated user's vehicles (404, not
      403, on another user's row).
- [ ] Create/update accept a `categoryCode` from `EXPENSE_CATEGORY_CODES`,
      resolved to `categoryId` server-side; `amount` validated `>= 0` with
      `numeric(10,2)` precision; request bodies validated by a shared Zod schema
      via `zodRoute()`.
- [ ] Creating/updating/deleting a fuel log, charging session, or service record
      upserts/deletes a matching expense row keyed by `(sourceType, sourceId)`
      with `amount = totalCost`, `expenseDate = entry date`, and the category
      `fuel` / `electricity` / `service` respectively.
- [ ] Auto-synced rows (`sourceType <> 'manual'`) are **read-only** through the
      expense write endpoints — PATCH/DELETE on them is rejected (edit the source
      entry instead).
- [ ] Listing/filtering returns both manual and auto-synced expenses; a
      `source` filter (`manual` | a specific source type) is supported.
- [ ] The cost-sync runs in the same transaction as the source mutation, so a
      total is never double-counted or orphaned (verified by integration tests).
- [ ] Zod schemas live in `@carnotea/shared`; types derived via `z.infer`.

## Files to touch

- `apps/api/src/expenses/` (controller, service, module)
- `apps/api/src/fuel-logs/`, `apps/api/src/charging-sessions/`,
  `apps/api/src/service-records/` — hook the sync into their services
- `apps/api/src/expenses/cost-sync.service.ts` (shared upsert/delete helper)
- `packages/shared/src/schemas/expense.ts`
- `apps/api/test/expenses.e2e-spec.ts`

## Out of scope

- Web expense screens (separate web ticket).
- Currency conversion — expenses inherit the vehicle's `currencyCode` as-is.
- Recurring/scheduled expenses and budgets.
- Backfilling historical entries created before this ticket (one-off migration
  task if needed → new ticket).

## Implementation notes

- Prefer a single `CostSyncService.upsertFromSource(tx, { sourceType, sourceId,
vehicleId, amount, date })` so each domain service calls one method; deletion
  cascades via the source row's `onDelete: 'cascade'` FK, but the explicit
  helper keeps behaviour testable.
- Use `INSERT ... ON CONFLICT (source_type, source_id) DO UPDATE` to respect the
  partial unique index.
- Service records: `totalCost` already includes parts + labor (kept consistent
  in T-024), so sync the record's `totalCost`, not a recomputed sum.

## References

- Schema: `packages/db/src/schema/expenses.ts`,
  `fuel-logs.ts`, `charging-sessions.ts`, `service-records.ts`
- Constants: `packages/shared/src/constants/expense-categories.ts`
- Related tickets: T-022, T-023, T-024, T-028 (analytics reads this ledger)
