---
id: T-038
title: Web expense screens with categories and auto-sync indicator
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-033, T-026]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-038 — Web expense screens with categories and auto-sync indicator

## Goal

Let a user view, add, edit, and delete expenses for a vehicle, with categories
surfaced and a clear distinction between auto-synced and manual expenses, all driven
by TanStack Query against the typed client.

## Context

Expenses are the unified money view: some rows are created manually, others are
auto-synced from fuel logs, charging sessions, and service records via the
`sourceType`/`sourceId` columns. They hang off the vehicle hub (T-033) and consume
the API from T-026. The UI must make derived rows obviously read-only so users don't
try to edit a fuel-derived expense directly.

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

## Contract

### Routes

| Route                                    | Screen      | Data                                      |
| ---------------------------------------- | ----------- | ----------------------------------------- |
| `/vehicles/$vehicleId/expenses`          | list        | `expensesQueryOptions(vehicleId, filter)` |
| `/vehicles/$vehicleId/expenses/new`      | create form | —                                         |
| `/vehicles/$vehicleId/expenses/$id/edit` | edit form   | `expenseQueryOptions(vehicleId, id)`      |

### Query keys

```
['vehicles', vehicleId, 'expenses', { source?, category? }]   # filtered list
['vehicles', vehicleId, 'expenses', id]                       # one expense
```

### Request / response shapes

- `ExpenseSchema`, `ExpenseCreateSchema`, `ExpenseUpdateSchema` from
  `@carnotea/shared`. Form fields (manual only): **`categoryCode` (from
  `EXPENSE_CATEGORY_CODES` with translated labels — not `categoryId`)**,
  `expenseDate`, `amount`, `description`. The response's `isAutoSynced` /
  `sourceType` drives read-only rendering.

### Provides

- _n/a_

### Consumes

- `apiClient` write methods (T-033 seam), vehicle-scoped layout (T-033), forms
  (T-031), expenses API (T-026).

## Acceptance criteria

- [ ] List shows expenses (date, category, amount, description, source) newest first,
      with loading/empty/error.
- [ ] Category renders as a translated label from `EXPENSE_CATEGORY_CODES`; list can
      filter by category and by source (manual vs auto-synced).
- [ ] Auto-synced rows (`sourceType ≠ 'manual'`) are visually flagged and not
      editable/deletable in place; the UI explains they are managed from their source
      log and links to it; attempting to edit one is prevented client-side (the API
      also returns 409).
- [ ] Create/edit (manual only) use the T-031 form stack with the shared schema using
      `categoryCode`.
- [ ] Delete (manual only) asks for confirmation.
- [ ] All reads/writes via TanStack Query + typed client; mutations invalidate the
      expense list.
- [ ] Every string in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, filter, create manual, edit, delete, synced
      rows read-only); fallback noted.

## Test matrix

Inherits the screens baseline, plus:

| Case                        | Expected                                               |
| --------------------------- | ------------------------------------------------------ |
| category options translated | select lists `EXPENSE_CATEGORY_CODES` pl/en labels     |
| synced row read-only        | auto-synced rows have no edit/delete; show source link |
| source filter               | filtering by `manual`/source type narrows the list     |
| 409 on synced edit          | API 409 on a synced row surfaces as a clear message    |

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/expenses/**`
- `apps/web/src/features/expenses/**`
- `apps/web/src/locales/{pl,en}/expenses.json`

## Out of scope

- API work for expenses (T-026) — typed client consumed as-is.
- Editing the source logs (fuel/charging/service) — T-034, T-035, T-036 own those.
- Cost breakdown analytics across categories — that is the dashboard (T-040).

## Implementation notes

- Drive editability off `sourceType === 'manual'` (or `isAutoSynced`); render a
  "managed by source" hint with a link to the originating log for derived rows.
- Category select reuses the expense-category lookup with translated labels and a long
  `staleTime`.
- Format `amount` with the vehicle's `currencyCode`.

## Verification

- `pnpm --filter @carnotea/web test expenses` → all pass
- `pnpm --filter @carnotea/web dev` → agent-browser exercises list/filter/create/edit/delete + read-only synced rows
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-033, T-026, T-031, T-011, T-034/T-035/T-036 (sync sources)
- Schema: `packages/db/src/schema/expenses.ts`; constants:
  `packages/shared/src/constants/expense-categories.ts`
