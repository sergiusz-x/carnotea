---
id: T-058
title: Web-screens pattern + rewrite web tickets to delta specs
status: done
priority: high
size: L
spec_version: 1
owner: claude-opus-4-8
dependencies: [T-056]
labels: [process, docs, web]
created_at: 2026-06-21
updated_at: 2026-06-21
closed_at: 2026-06-21
---

# T-058 — Web-screens pattern + rewrite web tickets

## Goal

Add a canonical web-screens pattern doc and rewrite every ready web ticket to pin
routes, query keys, and contracts against it — fixing the field/contract drift those
tickets carried.

## Context

The web screen tickets re-derived the same screen shape and several drifted from the
API contracts: forms referenced DB ids (`chargerTypeId`, `statusId`, `priorityId`,
`categoryId`) where the API exposes **codes**, and let users edit server-computed
`totalCost`. They also never surfaced that the typed `apiClient` is GET-only and
needs write methods before any CRUD screen can mutate.

## Contract

### Delivered artifacts

- `docs/agents/patterns/web-screens.md` — routes, hierarchical query keys, the four
  UI states, forms, i18n, a11y baseline, the apiClient-write-methods dependency,
  baseline test matrix, standard verification.
- Rewrites (`spec_version: 1`): T-032, T-033, T-034, T-035, T-036, T-037, T-038,
  T-039, T-040, T-041.

### Provides

- The web pattern referenced by future web tickets; the frozen `apiClient`
  write-methods seam is assigned to T-033 and consumed by T-034–T-041.

### Consumes

- The extended template + DoR (T-056).

## Acceptance criteria

- [ ] `web-screens.md` exists and is linked from the Task Router and
      working-with-tickets.
- [ ] T-032 through T-041 carry a Contract (routes + query keys + Provides/Consumes),
      a Test matrix, and a Verification section.
- [ ] Drift fixed: forms use lookup **codes** not ids; server-computed `totalCost`/
      `totalPrice` are read-only previews, never form fields.
- [ ] The `apiClient` POST/PATCH/DELETE seam is assigned (T-033 Provides) and consumed
      by the child-screen tickets.

## Test matrix

| Case                       | Expected                                                             |
| -------------------------- | -------------------------------------------------------------------- |
| rewritten tickets lint     | `pnpm lint:tickets` passes the extended tier                         |
| no DB-id form fields       | grep finds no `chargerTypeId`/`statusId`/`categoryId` as form fields |
| client-writes seam present | T-033 `Provides` lists POST/PATCH/DELETE                             |

## Files to touch

- `docs/agents/patterns/web-screens.md`
- `tickets/T-032..T-041-*.md`

## Out of scope

- Implementing any screen — spec rewrites only.
- API tickets and the API pattern — T-057.

## Implementation notes

- Mechanics already live in `apps/web/AGENTS.md`; the pattern doc is the
  ticket-contract layer that complements it, not a duplicate.

## Verification

- `pnpm lint:tickets` → passes
- `pnpm format:check` → passes for the changed markdown

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-056, T-057, T-059
