# ADR-0008: Tickets live as markdown files in the repo

- **Status**: accepted
- **Date**: 2026-06-13
- **Deciders**: Sergiusz, Claude

## Context

The work is driven primarily by AI agents. Agents work best when context is
local: the spec, the acceptance criteria, the dependencies, and the historical
record all live next to the code.

We could use GitHub Issues, Linear, or Jira. Those work well for human teams,
but they require API calls and credentials for an agent to see them, and they
fragment context between "issue tracker" and "repo".

## Decision

Tickets live as markdown files in `tickets/` with the layout:

```
tickets/
├── README.md       # How the system works.
├── _template.md    # Copy this to create a new ticket.
├── INDEX.md        # Single source of truth listing.
└── T-NNN-slug.md   # One file per ticket, forever.
```

Each ticket has YAML frontmatter (status, owner, dependencies, dates) and a
structured body (goal, context, acceptance criteria, files to touch, out of
scope, notes). The body follows `_template.md` verbatim.

`INDEX.md` is the single source of truth for "what is pending / in progress /
done" and is updated in the same PR as the ticket itself.

## Consequences

### Positive

- Agents read the same docs humans do - no extra integration.
- `git blame` on a ticket file shows the full history of the spec.
- Branching the repo branches the ticket state.
- Search-in-repo finds tickets too.

### Negative

- No built-in notifications, no Kanban board, no rich attachments.
- Two contributors editing the same ticket file simultaneously will need to
  resolve a git conflict.

### Neutral

- We can mirror the ticket state into GitHub Issues later via a simple sync
  script if collaboration grows beyond a couple of contributors. Today we
  don't need it.

## Alternatives considered

### Option A: GitHub Issues

Rejected. Adds a second source of truth, splits history, and requires extra
agent permissions.

### Option B: Linear / Jira

Rejected. Heavyweight for a personal project and requires API tokens for
agents.

### Option C: A single `BACKLOG.md`

Rejected. Doesn't scale beyond a dozen items, no per-ticket history, no easy
way to track dependencies.
