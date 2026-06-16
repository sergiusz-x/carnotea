---
id: T-038
title: Web expense screens with categories and auto-sync indicator
status: ready
priority: medium
owner: ~
dependencies: [T-033, T-026]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-038 — Web expense screens with categories and auto-sync indicator

## Goal

Let a user view, add, edit, and delete expenses for a vehicle, with categories
surfaced and a clear distinction between auto-synced and manual expenses, all
driven by TanStack Query against the typed client.

## Context

Expenses are the unified money view: some rows are created manually, others are
auto-synced from fuel logs, charging sessions, and service records via the
`sourceType`/`sourceId` columns. They hang off the vehicle hub (T-033) and
consume the API from T-026. The UI must make derived rows obviously read-only so
users don't try to edit a fuel-derived expense directly.

## Acceptance criteria

- [ ] `/vehicles/:vehicleId/expenses` lists expenses (date, category, amount,
      description, source) newest first, with loading, empty, and error states.
- [ ] Category renders as a translated label sourced from
      `EXPENSE_CATEGORY_CODES` (fuel, electricity, service, parts, insurance,
      inspection, other); list can filter by category.
- [ ] Auto-synced rows (`sourceType` ≠ `manual`: fuel_log, charging_session,
      service_record, other) are visually flagged and not editable/deletable in
      place; the UI explains they are managed from their source log.
- [ ] Create and edit (manual only) use the T-031 form stack with the shared Zod
      expense schema: categoryId, expenseDate, amount, description.
- [ ] Delete (manual only) asks for confirmation.
- [ ] All reads/writes go through TanStack Query + the typed client; mutations
      invalidate the expense list.
- [ ] Every user-facing string exists in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, filter, create manual, edit, delete, and
      that synced rows are read-only). If Chrome is blocked, fall back to the
      documented structural verification and note it.

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/expenses/**`
- `apps/web/src/features/expenses/**` (components, hooks, query options)
- `apps/web/src/locales/pl/expenses.json`, `apps/web/src/locales/en/expenses.json`

## Out of scope

- API work for expenses (T-026) — typed client consumed as-is.
- Editing the source logs (fuel/charging/service) — those own their own rows
  (T-034, T-035, T-036).
- Cost breakdown analytics across categories — that is the dashboard (T-040).

## Implementation notes

- Drive editability off `sourceType === 'manual'`; render a "managed by source"
  hint with a link to the originating log for derived rows.
- Category select reuses the expense-category lookup with translated labels and a
  long `staleTime`.
- Format `amount` with the vehicle's `currencyCode`.

## References

- Related tickets: T-033 (vehicle hub), T-026 (API expenses), T-031 (forms),
  T-011 (typed client), T-034/T-035/T-036 (sources of synced expenses)
- Schema: `packages/db/src/schema/expenses.ts`
- Constants: `packages/shared/src/constants/expense-categories.ts`
