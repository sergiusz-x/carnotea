# Conventions specifically for AI agents

This page captures rules that apply only to agents working with this repo.
Humans can follow them too, but they're framed around how an agent operates.

## 1. Before you write code

- Read the relevant `AGENTS.md` files top-down (root → area → sub-area).
- Open the ticket. Re-read `Acceptance criteria` and `Out of scope`.
- Skim adjacent files in the area you're about to change - you might find the
  same thing already exists.

## 2. While you write code

- Match the style of the surrounding code, not what you'd write from scratch.
- Use the workspace dependencies, don't add new ones casually. New top-level
  deps require an ADR or an ADR update.
- Run the type-checker and the linter in your head, then for real, before you
  consider a task done. They catch trivial mistakes that waste review time.

## 3. When you finish a task

- Update the ticket (status, notes, acceptance checklist).
- Update `tickets/INDEX.md`.
- Update affected docs (`tech-stack.md`, `getting-started.md`, `README.md`,
  area `AGENTS.md`) in the same PR.
- Open the PR with a body that:
  - links to the ticket,
  - lists what changed,
  - says how it was verified,
  - flags anything that wasn't verified.

## 4. Anti-patterns specific to agents

- **Inventing a tool** - if you can't find a documented choice for "how do we
  do X here", ask the user. Don't guess and write an ADR after the fact.
- **Cargo-culting code from other repos** - it's tempting to copy a pattern
  you've seen in other projects. Check whether it fits _this_ project's
  conventions first.
- **Hallucinating a file or symbol** - if a doc references `packages/db/...`,
  verify the file exists before relying on it. If the doc is wrong, fix the doc
  in the same PR.
- **Hiding scope creep** - if the ticket says "scaffold X" and you also
  refactored Y, that's a second ticket - either revert Y or split the PR.
- **Marking work done when it isn't** - the harness measures done-ness by the
  ticket's `done` status. If you mark it prematurely, the next agent will
  assume it works.

## 5. Agent-friendly defaults

- Prefer **one clear file** over several "neat" ones. The next agent will read
  one file faster than four.
- Prefer **boring code** to clever code. Boring code is easy to extend, test,
  and review.
- Prefer **explicit naming** to short names. `currentMileageKm` beats `cm`.
- Prefer **comments that answer "why"** to comments that describe "what". The
  what is in the code.

## 6. When in doubt

Ask the user. The cost of a question is a few seconds. The cost of a wrong
direction is a PR that has to be unwound.
