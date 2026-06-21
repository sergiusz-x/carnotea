# Tickets

Every piece of work that lands in this repository starts as a ticket here. This
README explains the mechanics. The day-to-day protocol for picking up a ticket
lives in
[`docs/agents/working-with-tickets.md`](../docs/agents/working-with-tickets.md).

## Files in this folder

| File            | What it is                                                       |
| --------------- | ---------------------------------------------------------------- |
| `README.md`     | This file. The "how the system works" reference.                 |
| `_template.md`  | The starting point for every new ticket. Copy it, don't edit it. |
| `INDEX.md`      | Generated list of every ticket by status (`pnpm tickets:index`). |
| `T-NNN-slug.md` | One file per ticket. The filename's `NNN` matches the id.        |

## Ticket id and filename

Ids are monotonic, zero-padded to three digits, prefixed with `T-`. The next id
is one higher than the highest in `INDEX.md`. No gaps, no reuse - even when a
ticket is dropped.

The filename is `T-NNN-<kebab-case-slug>.md`. The slug is the human-readable
description; it can be updated as the ticket evolves (rename the file in the
same PR).

## Frontmatter fields

```yaml
---
id: T-001 # immutable, matches filename
title: Bootstrap tooling and workspaces # short imperative summary
status: ready # see "Lifecycle" below
priority: high # low | medium | high
size: M # S | M | L (one ticket = one PR; see definition-of-ready.md)
spec_version: 1 # opts into the extended template (Contract/Test matrix/Verification)
owner: ~ # github handle or "claude", ~ = unassigned
dependencies: [] # list of ticket ids: [T-000]
labels: [bootstrap, repo] # free-form tags
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~ # set when status becomes "done"
---
```

`status` values: `backlog`, `ready`, `in_progress`, `blocked`, `in_review`,
`done`. See `docs/agents/working-with-tickets.md` for what each one means.

## Body structure

Every ticket follows `_template.md` verbatim:

- **Goal** - one sentence: what does success look like?
- **Context** - why now? what does it unblock?
- **Acceptance criteria** - a checklist. Each box is independently verifiable.
- **Files to touch** - approximate blast radius. Not a contract, but a hint.
- **Out of scope** - things to explicitly _not_ do.
- **Implementation notes** - guidance for whoever picks it up. Updated as the
  work progresses.
- **References** - links to ADRs, related tickets, external docs.

When a section is genuinely not applicable, write `_n/a_` rather than removing
the heading. That way the next agent sees you thought about it.

## INDEX.md

Each ticket's `status` frontmatter is the source of truth; `INDEX.md` is
**generated** from it by `scripts/gen-tickets-index.mjs` (`pnpm tickets:index`).
Never hand-edit the list between the `BEGIN/END GENERATED` markers — change the
status in the ticket file and regenerate. `pnpm lint:tickets` (CI) fails if the
two disagree. See [ADR-0012](../docs/adr/0012-tickets-index-generated-from-frontmatter.md).

The index groups tickets by status. New tickets land in `backlog` first; the
agent or human refining them promotes them to `ready` once the spec passes the
[Definition of Ready](../docs/agents/definition-of-ready.md).

## Creating a ticket

1. Pick the next free id (highest in `INDEX.md` + 1).
2. `cp tickets/_template.md tickets/T-NNN-<slug>.md`.
3. Fill in frontmatter and body.
4. Run `pnpm tickets:index` to add it to the generated list.
5. Open a PR. The PR title is `chore(tickets): add T-NNN <slug>`.

## Working on a ticket

See [`docs/agents/working-with-tickets.md`](../docs/agents/working-with-tickets.md).

## Closing a ticket

When a PR that closes a ticket is merged:

1. The ticket's frontmatter is updated to `status: done` with `closed_at` set
   to the merge date.
2. `pnpm tickets:index` regenerates `INDEX.md` (the ticket lands under "Done").
3. The PR title or body contains `Closes T-NNN`.

A `done` ticket file is never edited afterwards. To revise the underlying
decision, write a new ticket that supersedes it.
