# ADR-0012: Ticket status lives in frontmatter; INDEX.md is generated

- **Status**: accepted
- **Date**: 2026-06-21
- **Deciders**: Sergiusz, Claude
- **Related tickets**: T-060
- **Supersedes**: the "INDEX.md is the single source of truth" decision in
  [ADR-0008](./0008-tickets-as-markdown.md)

## Context

ADR-0008 made `tickets/INDEX.md` the single source of truth for ticket status and
required it to be hand-edited in the same PR as any status change. It even noted
the downside: concurrent edits conflict.

In practice that downside dominated. `INDEX.md` is one shared file with one line
region per status section, so any two PRs that move a ticket between sections edit
the same lines and merge-conflict — a constant tax as throughput grew. The
information is fully redundant: each ticket's `status` already lives in its own
frontmatter (one file per ticket, so concurrent changes to different tickets never
touch the same file).

## Decision

We will treat each ticket's `status` frontmatter as the single source of truth and
**generate** the list region of `INDEX.md` from it via `scripts/gen-tickets-index.mjs`
(`pnpm tickets:index`). Only the region between the `BEGIN/END GENERATED` markers is
generated; the intro and Conventions stay hand-written. `tickets/INDEX.md` is marked
`merge=union` in `.gitattributes` so concurrent regenerations never hard-conflict, and
`scripts/lint-tickets.mjs` (CI) fails if the index disagrees with the frontmatter —
which a re-run of the generator fixes.

## Consequences

### Positive

- Moving a ticket between sections is a one-line frontmatter edit in its own file —
  no shared-line conflicts between PRs.
- `INDEX.md` can never silently drift from the tickets: the linter enforces equality
  and the generator makes it deterministic (sorted by id).
- The committed, browseable index is preserved.

### Negative

- A `merge=union` collision can leave a duplicate line on `main`; the linter catches
  it and `pnpm tickets:index` normalizes it (a fixup commit, not a blocked merge).
- One more generated artifact and `pnpm` script to know about.

### Neutral

- `.gitattributes` `merge=union` only takes effect for merges performed locally with
  that attribute present; CI's linter is the backstop regardless.

## Alternatives considered

### Option A: Keep hand-editing INDEX.md (ADR-0008 status quo)

Rejected — that is exactly the source of the conflicts.

### Option B: Stop committing INDEX.md (generate on demand only)

Rejected — eliminates conflicts entirely but loses the browseable list in the repo /
on GitHub. The generate-plus-union approach keeps the list while removing the
conflicts.

### Option C: `.gitattributes merge=union` alone, no generator

Rejected as insufficient on its own — union merges of "move" operations leave
duplicates with no deterministic way to normalize them. The generator provides that.
