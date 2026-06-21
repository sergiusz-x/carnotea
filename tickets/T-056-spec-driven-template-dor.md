---
id: T-056
title: Spec-driven ticket template + Definition of Ready
status: done
priority: high
size: M
spec_version: 1
owner: claude-opus-4-8
dependencies: []
labels: [process, docs]
created_at: 2026-06-21
updated_at: 2026-06-21
closed_at: 2026-06-21
---

# T-056 — Spec-driven ticket template + Definition of Ready

## Goal

Upgrade the ticket template so every ticket carries a machine-checkable contract,
test matrix, and verification recipe, and add a Definition of Ready that gates a
ticket into `ready`.

## Context

Tickets were well written but prose-heavy: acceptance criteria like "a CSP
appropriate for the app" can't be executed twice the same way by an AI agent, and
nothing pinned the exact endpoint surface, error codes, or inter-ticket contracts.
This adds the structure that makes a ticket executable end-to-end without
clarifying questions — the foundation for the pattern docs (T-057/T-058) and the
linter (T-059).

## Contract

### Delivered artifacts

- `tickets/_template.md` — adds `size` + `spec_version` frontmatter and the
  `## Contract` (endpoints, request/response, Provides, Consumes), `## Test matrix`,
  and `## Verification` sections.
- `docs/agents/definition-of-ready.md` — the gate into `ready`.
- Wiring: `docs/agents/working-with-tickets.md`, `docs/agents/structure.md`, and the
  root `AGENTS.md` Task Router reference the new doc.

### Provides

- The extended template + DoR that T-057/T-058 apply and T-059 enforces.

### Consumes

- _n/a_

## Acceptance criteria

- [ ] Template has `size` (S/M/L) and `spec_version`, plus Contract / Test matrix /
      Verification sections with inline guidance.
- [ ] `definition-of-ready.md` exists and is linked from the template,
      working-with-tickets, structure map, and the Task Router.
- [ ] Existing docs that describe the ticket flow point to the new gate.

## Test matrix

| Case             | Expected                                                          |
| ---------------- | ----------------------------------------------------------------- |
| template parses  | `pnpm lint:tickets` accepts a `spec_version` ticket built from it |
| DoR discoverable | linked from template + AGENTS.md Task Router                      |

## Files to touch

- `tickets/_template.md`
- `docs/agents/definition-of-ready.md`
- `docs/agents/working-with-tickets.md`, `docs/agents/structure.md`, `AGENTS.md`

## Out of scope

- The pattern docs (T-057/T-058) and the linter (T-059) — their own tickets.
- Rewriting existing tickets — done under T-057/T-058.

## Implementation notes

- `spec_version` opts a ticket into the extended linter tier, so legacy and `done`
  tickets are never forced to backfill.

## Verification

- `pnpm lint:tickets` → passes
- `pnpm format:check` → passes for the changed markdown

## References

- Definition of Ready: [definition-of-ready.md](../docs/agents/definition-of-ready.md)
- Related tickets: T-057, T-058, T-059
