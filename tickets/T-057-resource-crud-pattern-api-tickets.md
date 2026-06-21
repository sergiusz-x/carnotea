---
id: T-057
title: Resource-CRUD API pattern + rewrite API tickets to delta specs
status: done
priority: high
size: L
spec_version: 1
owner: claude-opus-4-8
dependencies: [T-056]
labels: [process, docs, api]
created_at: 2026-06-21
updated_at: 2026-06-21
closed_at: 2026-06-21
---

# T-057 — Resource-CRUD API pattern + rewrite API tickets

## Goal

Factor the common owned-resource CRUD spec into one canonical pattern doc, then
rewrite every ready API ticket to express only its delta against it — fixing the
contract drift those tickets carried.

## Context

Six-plus API tickets re-derived CRUD, ownership, error mapping, and validation in
prose, and several drifted from the actual code: validation status `422` (the pipe
throws `400 VALIDATION_ERROR`), `apps/api/test/*.e2e-spec.ts` paths (tests are
co-located `*.test.ts`), and an unresolved "T-019 decimal convention" that the code
already settled. Centralizing the spec removes the duplication and the drift.

## Contract

### Delivered artifacts

- `docs/agents/patterns/resource-crud-api.md` — route shape, error/status table
  (400/401/404/409), ownership (404-not-403), decimals, lookup codes, derived-data
  hooks, module layout, baseline test matrix, standard verification.
- Rewrites (Contract / Test matrix / Verification, `spec_version: 1`): T-021, T-023,
  T-024, T-025, T-026, T-027, T-028, T-029, T-030.

### Provides

- The API pattern referenced by future API tickets.

### Consumes

- The extended template + DoR (T-056).

## Acceptance criteria

- [ ] `resource-crud-api.md` exists and is linked from the Task Router and
      working-with-tickets.
- [ ] T-021/T-023/T-024/T-025/T-026/T-027/T-028/T-029/T-030 carry a Contract (endpoint
      table, Provides/Consumes), a Test matrix, and a Verification section.
- [ ] Drift fixed: no `422` for validation (use 400 VALIDATION_ERROR); no
      `apps/api/test/*.e2e-spec.ts` references; decimal convention pinned to
      `_shared.ts`.
- [ ] Frozen inter-ticket seams are written into `Provides`/`Consumes`
      (mileage-sync, cost-sync).

## Test matrix

| Case                   | Expected                                            |
| ---------------------- | --------------------------------------------------- |
| rewritten tickets lint | `pnpm lint:tickets` passes the extended tier        |
| no 422 left            | grep for `422` in rewritten tickets finds none      |
| no e2e-spec path left  | grep for `e2e-spec` in rewritten tickets finds none |

## Files to touch

- `docs/agents/patterns/resource-crud-api.md`
- `tickets/T-021,023,024,025,026,027,028,029,030-*.md`

## Out of scope

- Implementing any of the features themselves — these are spec rewrites only.
- Web tickets and the web pattern — T-058.

## Implementation notes

- Each ticket keeps its strong Goal/Context/Out-of-scope/Notes; only the delta
  (fields, invariants, sync hooks) and the new sections change.

## Verification

- `pnpm lint:tickets` → passes
- `rg -n '422|e2e-spec' tickets/T-02*.md tickets/T-030*.md` → no matches in rewritten files

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Related tickets: T-056, T-058, T-059
