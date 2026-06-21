---
id: T-060
title: Generate INDEX.md from frontmatter to end status-move merge conflicts
status: done
priority: medium
size: M
spec_version: 1
owner: claude-opus-4-8
dependencies: [T-059]
labels: [process, tooling, docs]
created_at: 2026-06-21
updated_at: 2026-06-21
closed_at: 2026-06-21
---

# T-060 — Generate INDEX.md from frontmatter

## Goal

Make each ticket's `status` frontmatter the single source of truth and generate
`tickets/INDEX.md` from it, so two PRs moving tickets between sections no longer
merge-conflict on the shared index.

## Context

`INDEX.md` was hand-edited (ADR-0008) — one shared file with a line region per
status, so concurrent status moves edited the same lines and conflicted. The status
already lives per-ticket in frontmatter (no shared-line conflicts), so the index is
a redundant view that can be generated. Supersedes the relevant part of ADR-0008.

## Contract

### Delivered artifacts

- `scripts/gen-tickets-index.mjs` — regenerates the region between the
  `BEGIN/END GENERATED:tickets` markers in `INDEX.md` from frontmatter, sorted by id.
- `package.json` script `tickets:index`.
- `.gitattributes` — `tickets/INDEX.md merge=union` (concurrent regenerations don't
  hard-conflict).
- `tickets/INDEX.md` — restructured with markers; intro/Conventions note the new flow.
- `docs/adr/0012-tickets-index-generated-from-frontmatter.md` (accepted).
- Doc updates: working-with-tickets, ticket-execution, conventions-for-agents,
  self-review, lessons, structure, tickets/README, PR template — all now say
  "edit frontmatter, run `pnpm tickets:index`", never "hand-edit INDEX".

### Provides

- The generated-index workflow every future ticket status change uses.

### Consumes

- The ticket linter (T-059) verifies INDEX ↔ frontmatter consistency.

## Acceptance criteria

- [ ] `pnpm tickets:index` regenerates the marked region of `INDEX.md` from
      frontmatter and is idempotent (a second run is a no-op).
- [ ] `.gitattributes` marks `tickets/INDEX.md merge=union`.
- [ ] No doc instructs hand-editing `INDEX.md`; all point to `pnpm tickets:index`.
- [ ] ADR-0012 records the decision and supersedes the ADR-0008 point.
- [ ] `pnpm lint:tickets` passes after regeneration.

## Test matrix

| Case                    | Expected                                           |
| ----------------------- | -------------------------------------------------- |
| regenerate              | `pnpm tickets:index` rewrites the marked region    |
| idempotent              | second run prints "already up to date"             |
| status change reflected | flip a ticket's `status`, regen → it moves section |
| missing markers         | generator exits 1 with a clear message             |
| lint agrees             | `pnpm lint:tickets` passes post-regen              |

## Files to touch

- `scripts/gen-tickets-index.mjs`, `package.json`, `.gitattributes`
- `tickets/INDEX.md`, `docs/adr/0012-*.md`
- `docs/agents/{working-with-tickets,ticket-execution,conventions-for-agents,self-review,lessons,structure}.md`
- `tickets/README.md`, `.github/PULL_REQUEST_TEMPLATE.md`

## Out of scope

- Dropping the committed INDEX entirely (considered and rejected in ADR-0012).
- Auto-running the generator in a pre-commit hook — manual + CI lint for now.

## Implementation notes

- Generator is dependency-free Node ESM with a minimal frontmatter parser, matching
  `lint-tickets.mjs`.
- `merge=union` only applies to merges made with the attribute present; the CI linter
  is the backstop, and a re-run of the generator normalizes any union duplicate.

## Verification

- `pnpm tickets:index` → regenerates, second run "already up to date"
- `pnpm lint:tickets` → passes
- `rg -n "Move (its|the) line in .tickets/INDEX" docs tickets .github` → no matches

## References

- ADR: [ADR-0012](../docs/adr/0012-tickets-index-generated-from-frontmatter.md),
  supersedes part of [ADR-0008](../docs/adr/0008-tickets-as-markdown.md)
- Related tickets: T-059 (linter)
