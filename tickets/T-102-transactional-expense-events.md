---
id: T-102
title: Emit transactional expense lifecycle events
status: backlog
priority: high
size: M
spec_version: 1
owner: ~
dependencies: [T-100]
labels: [api, expenses, integrations, transactions]
created_at: 2026-07-28
updated_at: 2026-07-28
closed_at: ~
---

# T-102 — Emit transactional expense lifecycle events

## Goal

Durably emit one product-neutral event whenever a normalized CarNotea expense is created, materially updated, or deleted, in the same database transaction as the expense change.

## Context

The `expenses` table is the canonical normalized cost ledger. Manual expenses and cost-bearing fuel, charge, service, and fluid records all write through `ExpensesService` or `CostSyncService`. Emitting from each source controller would miss paths and expose source-specific coupling. This ticket adds a transaction-composable event-writer seam at the expense projection boundary.

## Contract

### Endpoints / routes

_n/a — existing domain routes keep their public shapes._

### Request / response shapes

Freeze `ExpenseWebhookDataV1Schema`:

- `expenseId`: UUID.
- `vehicle`: `{ id: UUID, displayName: string }`.
- `date`: ISO date.
- `amount`: canonical fixed two-decimal string, never binary JSON float.
- `currency`: uppercase ISO-style three-letter code resolved from the owning user's current currency preference at event time.
- `category`: stable expense category code.
- `description`: nullable string.
- `source`: `{ type: "manual" | "fuel_log" | "charging_session" | "service_record" | "fluid_log", id: UUID | null }`.
- `revision`: positive integer monotonically increasing for this expense.

Created and updated events carry the resulting snapshot. Deleted events carry the last committed snapshot plus `deletedAt`.

Material update means at least one externally visible snapshot field changed. Repeating an idempotent derived upsert with an identical snapshot emits no event.

### Provides

- `ExpenseEventWriter.record(tx, { userId, expense, operation: "created" | "updated" | "deleted" }): Promise<void>`.
- Fan-out inside the same transaction: one immutable event plus one delivery per enabled owned subscription selecting that type.
- Event emission from manual expense CRUD and all `CostSyncService` create/update/delete paths.

### Consumes

- T-100 event, delivery, and envelope persistence with `spec_version: 1`.
- Existing transaction-first `CostSyncService` callers and manual `ExpensesService`.
- User profile currency preference and vehicle display name.

## Acceptance criteria

- [ ] Manual expense create/update/delete atomically create the matching lifecycle event and deliveries for every enabled matching subscription.
- [ ] Fuel, charging, service, and fluid cost projection create/update/delete paths produce the same expense event family without emitting their source entity payloads.
- [ ] A rollback after event insertion rolls back the expense/source mutation, event, and delivery rows together.
- [ ] A failure to insert the event or required fan-out rows rolls back the domain mutation rather than leaving an unobservable committed expense.
- [ ] Repeating a derived upsert with no externally visible snapshot change emits no update event.
- [ ] Every material update increments `revision`; delete uses the next revision and includes the final snapshot and `deletedAt`.
- [ ] Disabled subscriptions and subscriptions not selecting the event type receive no delivery row.
- [ ] Payloads contain exactly the frozen generic fields and never user email, auth ids beyond ownership-internal storage, webhook configuration, or receiver-specific mapping fields.
- [ ] Existing expense and source endpoint response contracts remain unchanged.

## Test matrix

| Case                   | Input                                         | Expected                                        |
| ---------------------- | --------------------------------------------- | ----------------------------------------------- |
| manual create          | valid expense                                 | one `expense.created`, revision 1               |
| derived create         | new fuel/charge/service/fluid cost            | one normalized `expense.created`                |
| material update        | amount/date/category/description changes      | one `expense.updated`, next revision            |
| no-op upsert           | same normalized snapshot                      | no event                                        |
| delete                 | existing manual or source-derived expense     | one `expense.deleted` with final snapshot       |
| transaction rollback   | force event/fan-out insert failure            | no domain or integration rows commit            |
| subscription filtering | matching, nonmatching, disabled subscriptions | delivery only for enabled matching subscription |
| two rapid updates      | revisions N+1 and N+2                         | stable subject id and monotonic revisions       |
| privacy                | inspect serialized event                      | only Contract fields present                    |

## Files to touch

- `packages/shared/src/schemas/webhook.ts`
- `packages/shared/src/schemas/webhook.test.ts`
- `apps/api/src/webhooks/expense-event-writer.ts`
- `apps/api/src/expenses/expenses.service.ts`
- `apps/api/src/expenses/cost-sync.service.ts`
- Cost-bearing source service tests

## Out of scope

- HTTP delivery.
- Management UI.
- Mapping categories or payment sources for any receiver.
- Events unrelated to normalized expenses.
- Historical backfill.

## Implementation notes

Avoid controller hooks and database triggers. Pass the caller's existing Drizzle transaction into the event writer. Compare canonical snapshots after fixed-decimal normalization so representation differences do not create false updates.

## Verification

- `pnpm --filter @carnotea/api test expenses fuel-logs charging-sessions service-records fluid-logs webhooks` → lifecycle and rollback matrix passes.
- `pnpm --filter @carnotea/shared test webhook` → payload contract passes.
- `pnpm --filter @carnotea/api typecheck` → zero errors.
- `pnpm lint && pnpm format:check && pnpm typecheck` → all pass.

## References

- Persistence/contracts: [T-100](./T-100-webhook-persistence-and-contracts.md)
- Atomic sync: [T-061](./T-061-atomic-derived-sync-seam.md)
- Expenses implementation: [`apps/api/src/expenses/`](../apps/api/src/expenses)
