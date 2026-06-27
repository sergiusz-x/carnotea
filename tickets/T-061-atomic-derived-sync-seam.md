---
id: T-061
title: Make derived-sync seams transaction-composable and source writes atomic
status: done
priority: high
size: M
spec_version: 1
owner: codex
dependencies: [T-022]
labels: [api, refactor, data-integrity]
created_at: 2026-06-21
updated_at: 2026-06-26
closed_at: 2026-06-26
---

# T-061 — Atomic, transaction-composable derived-sync seams

## Goal

Make a resource's own write and its derived mileage/cost writes happen in **one**
database transaction, by giving the sync seams a `tx`-first signature instead of
each opening its own transaction.

## Context

`FuelLogsService.create` (`apps/api/src/fuel-logs/fuel-logs.service.ts`) inserts the
fuel log, then calls `MileageSyncService.syncDerivedReading(...)`, which opens its
**own** `this.db.transaction` (`apps/api/src/mileage/mileage-sync.service.ts`). So
the insert and the derived `mileage_readings` row are **not atomic**: a crash
between them leaves a fuel log with no derived reading and a stale
`vehicles.currentMileage`. The seam also can't be composed into a caller's
transaction, which is inconsistent with the cost-sync seam (T-026) that is speced to
take a `tx`. This pattern would be copied by charging sessions (T-023) and service
records (T-024) if not fixed first.

Follows [`patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md)
§ Derived-data hooks (already updated to the `tx`-first contract).

## Contract

### Provides

- `MileageSyncService.syncDerivedReading(tx, params)`,
  `removeDerivedReading(tx, params)`, `recomputeCurrentMileage(tx, vehicleId)` —
  all take the caller's transaction as the first argument and never open their own.
  This is the frozen seam T-021/T-023/T-024/T-026 build on.

### Consumes

- Drizzle's `db.transaction` (the resource service owns the transaction boundary).

## Acceptance criteria

- [x] `MileageSyncService` methods take a `tx` (Drizzle transaction/db handle) as
      the first argument and perform no internal `transaction(...)`.
- [x] `FuelLogsService` create/update/delete wrap the source write **and** the
      mileage-sync call in a single `db.transaction`, so they commit or roll back
      together.
- [x] `recomputeCurrentMileage` runs inside the same transaction as the change that
      triggered it.
- [x] Behaviour is otherwise unchanged: existing fuel-log and mileage tests still
      pass; `currentMileage` still equals the max reading after each operation.
- [x] The pattern doc and T-021 already describe this `tx`-first contract; no new
      drift is introduced.

## Test matrix

| Case                            | Input                              | Expected                                   |
| ------------------------------- | ---------------------------------- | ------------------------------------------ |
| insert + sync atomic on success | create a fuel log                  | both the log and its reading exist         |
| rollback on sync failure        | force the mileage write to throw   | the fuel-log insert is rolled back too     |
| seam takes a tx                 | call `syncDerivedReading(tx, ...)` | uses the passed tx; no nested transaction  |
| recompute inside tx             | delete the max reading within a tx | `currentMileage` recomputed in same commit |
| existing tests green            | run the fuel-logs + mileage suites | all pass                                   |

## Files to touch

- `apps/api/src/mileage/mileage-sync.service.ts` (tx-first signatures)
- `apps/api/src/fuel-logs/fuel-logs.service.ts` (wrap in one transaction)
- `apps/api/src/**/*.test.ts` (adjust calls; add the rollback test)

## Out of scope

- Implementing charging/service/expense resources (T-023/T-024/T-026) — they adopt
  the fixed seam when they land.
- Changing the OpenAPI contract or any response shape.

## Implementation notes

- Drizzle's `tx` has the same query surface as `db`, so the seam can accept
  `db | tx` typed as the transaction/database handle and call `.insert/.update`
  on it directly.
- Keep `recomputeCurrentMileage` as the single place that re-derives
  `currentMileage`, now parameterized by `tx`.

## Verification

- `pnpm --filter @carnotea/api test fuel-logs mileage` → all pass (incl. the new
  rollback test)
- `pnpm --filter @carnotea/api typecheck` → 0 errors

## Notes

- 2026-06-26: Production `MileageSyncService` and `FuelLogsService` already matched
  the `tx`-first transaction shape; this work locks the contract with regression
  tests for shared transaction handles, sync-failure propagation, and no nested
  mileage-sync transaction.

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md) § Derived-data hooks
- Lesson: [lessons.md](../docs/agents/lessons.md) — "derived writes share the source's transaction"
- Related tickets: T-021 (mileage seam), T-026 (cost seam), T-022 (fuel logs), T-023, T-024
