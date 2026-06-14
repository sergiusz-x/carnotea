# Working with tickets

This is the protocol every agent follows when picking up work. It is short on
purpose. If you find yourself improvising, stop and either update the ticket or
ask the user.

## Lifecycle of a ticket

```
backlog  →  ready  →  in_progress  →  in_review  →  done
                                   ↘  blocked  ↗
```

| Status        | Meaning                                                          |
| ------------- | ---------------------------------------------------------------- |
| `backlog`     | Idea captured but not refined. Don't start work.                 |
| `ready`       | Fully specced, dependencies satisfied. Safe to pick up.          |
| `in_progress` | Someone (you?) is actively working on it.                        |
| `blocked`     | Work paused waiting on something - the ticket says what.         |
| `in_review`   | PR open, awaiting review.                                        |
| `done`        | Merged. The ticket file stays as historical record.              |

Status lives in the ticket's frontmatter and is mirrored in `tickets/INDEX.md`.
Both update together in the same PR.

## How to pick up a ticket

1. Open [`tickets/INDEX.md`](../../tickets/INDEX.md) and scan for `ready`
   tickets you can work on.
2. Check the `Dependencies` field. All of them must be `done`. If they aren't,
   pick a different ticket.
3. Read the ticket end-to-end. Look at:
   - **Goal** - the one-line summary.
   - **Context** - why this work exists now.
   - **Acceptance criteria** - the explicit pass/fail checklist.
   - **Files to touch** - the rough blast radius.
   - **Out of scope** - things you must *not* do.
4. If something in the ticket is unclear, stop and update the ticket (or ask
   the user). Do not start coding around a vague spec.

## While you work

- Update the ticket status to `in_progress` and put your name (or `claude`) in
  the `Owner` field.
- Create a branch following [`docs/conventions.md`](../conventions.md#branches).
- Stay inside the ticket's scope. If you find a follow-up, write a new ticket
  in `backlog`, don't expand the current one.
- Keep the ticket's `Notes` section updated with decisions you made and
  trade-offs you weighed - that's the historical record.

## When you're done

1. Run the relevant **Validation Commands** from the root
   [`AGENTS.md`](../../AGENTS.md#validation-commands) and confirm they pass.
2. Tick off every box in `Acceptance criteria`. Don't tick what isn't actually
   true.
3. If any criterion can't be verified (e.g. you can't run a browser), say so
   explicitly in the PR description and in the ticket notes.
4. If a human corrected you while working, append a rule to
   [`lessons.md`](./lessons.md).
5. Update the ticket frontmatter: `status: in_review`, add `closed_at` once the
   PR is open.
6. Move the line in `tickets/INDEX.md` to the right section.
7. Open the PR. The PR body links to the ticket and follows
   [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md).
8. After merge, the PR title's "Closes T-XXX" closes the ticket - mark it `done`
   in the same commit, or in a follow-up `chore(tickets):` commit.

## Creating new tickets

Use [`tickets/_template.md`](../../tickets/_template.md) verbatim. Don't drop
sections you "don't need" - keep them and write `_n/a_` so the next agent knows
you thought about it.

Numbering is monotonic. The next ticket id is one higher than the highest in
`tickets/INDEX.md`. No gaps, no reuse.

Name the file `T-NNN-kebab-case-slug.md`.

## When a ticket is wrong

If the spec is wrong, fix the spec first:

- Tickets in `backlog` or `ready` can be edited freely.
- Tickets in `in_progress` or later can be edited, but the change must be
  recorded in the `Notes` section ("Spec revised on YYYY-MM-DD: ...").
- A `done` ticket is history - don't edit. Open a new ticket that supersedes it
  and add a "Superseded by T-XXX" line at the top of the old one.

## Anti-patterns

- "I'll just throw in a small refactor while I'm here." → No. Open a new ticket.
- "The acceptance criteria don't quite match what I built, but it's basically
  the same." → Update the AC *before* you tick them, or don't tick them.
- "I marked it done because I'll fix the rest in another PR." → Mark it
  `in_progress` and create a follow-up ticket.
- "I added a new dependency for this." → Did you also update an ADR? If not,
  back up.
