---
id: T-059
title: Ticket-spec linter + CI gate
status: done
priority: medium
size: M
spec_version: 1
owner: claude-opus-4-8
dependencies: [T-056]
labels: [process, ci, tooling]
created_at: 2026-06-21
updated_at: 2026-06-21
closed_at: 2026-06-21
---

# T-059 — Ticket-spec linter + CI gate

## Goal

Add a dependency-free linter that validates every ticket's frontmatter and the
`tickets/INDEX.md` consistency, wired as a `pnpm` script and a CI job, so spec
completeness and the index stay honest automatically.

## Context

Nothing enforced ticket structure or that `INDEX.md` mirrored ticket statuses — and
indeed three done tickets (T-006, T-009, T-010) were duplicated under both `Ready`
and `Done`. A linter makes the spec system self-checking and catches index drift on
every PR.

## Contract

### Delivered artifacts

- `scripts/lint-tickets.mjs` — core checks on every ticket (frontmatter keys,
  id↔filename, status/priority enums, `# T-NNN` heading, dependency references, no
  duplicate ids) and extended checks on `spec_version` tickets (size + Contract/Test
  matrix/Verification sections), plus INDEX ↔ status consistency (one section per
  ticket, section matches status).
- `package.json` script `lint:tickets`.
- `.github/workflows/tickets.yml` — runs the linter on changes under `tickets/`.
- `tickets/INDEX.md` — removed the T-006/T-009/T-010 duplicate Ready entries.

### Provides

- The enforced gate keeping the template (T-056) and patterns (T-057/T-058) honest.

### Consumes

- The extended template (T-056) defines the rules the linter enforces.

## Acceptance criteria

- [ ] `pnpm lint:tickets` validates frontmatter, heading, dependency references, and
      no duplicate ids on every ticket.
- [ ] Extended tier (tickets with `spec_version`) requires `size` and the Contract /
      Test matrix / Verification sections.
- [ ] INDEX consistency enforced: every ticket appears once, under the section
      matching its status; every INDEX entry has a file.
- [ ] CI runs the linter on `tickets/**` changes; the INDEX duplicates are removed so
      it passes on `main`.

## Test matrix

| Case                     | Expected                                           |
| ------------------------ | -------------------------------------------------- |
| clean repo               | `pnpm lint:tickets` exits 0                        |
| status/section mismatch  | a ticket filed under the wrong INDEX section fails |
| duplicate INDEX entry    | a ticket in two sections fails                     |
| missing extended section | a `spec_version` ticket without Test matrix fails  |
| bad dependency ref       | a dependency with no ticket file fails             |

## Files to touch

- `scripts/lint-tickets.mjs`
- `package.json` (script)
- `.github/workflows/tickets.yml`
- `tickets/INDEX.md`

## Out of scope

- Validating ticket prose quality or AC↔test mapping automatically (human judgement
  via the Definition of Ready).
- Auto-fixing tickets — the linter reports, it does not rewrite.

## Implementation notes

- Dependency-free Node ESM with a minimal frontmatter reader so CI needs no install
  step beyond Node.
- Two tiers via `spec_version` so legacy/`done` tickets are never forced to backfill.

## Verification

- `pnpm lint:tickets` → `✓ ticket lint: N tickets OK`
- Temporarily mis-file a ticket in INDEX → linter fails with a clear message (then revert)

## References

- Linter: `scripts/lint-tickets.mjs`
- Related tickets: T-056, T-057, T-058
