# Contributing to CarNotea

CarNotea is built primarily by AI agents, with a human in the loop. The rules
that make that work are short and enforced. This file is the human-facing
summary; the authoritative contract is [`AGENTS.md`](./AGENTS.md).

## The five-minute version

1. **Everything starts as a ticket.** Browse [`tickets/INDEX.md`](./tickets/INDEX.md),
   pick a `ready` one whose dependencies are all `done`. No matching ticket?
   Create one from [`tickets/_template.md`](./tickets/_template.md) first.
2. **One ticket, one PR.** If you find follow-up work, file a new ticket — don't
   expand the current one.
3. **Branch** as `<type>/<ticket-id>-<slug>`, e.g. `feat/T-007-vite-react-skeleton`.
4. **Commit** with [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(web): scaffold Vite + React app`.
5. **Before you open the PR**, run the validation commands relevant to your
   change (see below) and tick the acceptance criteria honestly.
6. **Open the PR** using the template; it must reference the ticket
   (`Closes T-XXX`).

## Setup

See [`docs/getting-started.md`](./docs/getting-started.md). In short:

```bash
cp .env.example .env
pnpm install
pnpm db:up
```

## Validation

Run the smallest set that covers your change:

```bash
pnpm lint          # ESLint
pnpm format:check  # Prettier
pnpm typecheck     # tsc
pnpm test          # Vitest
pnpm build         # build
pnpm lint:ws       # sherif — workspace dependency consistency
```

A change is **done** when the ticket's acceptance criteria are all genuinely
true, the relevant commands pass, and any docs the change affects are updated in
the same commit.

## Conventions

- Code style, naming, commits, branches, PRs: [`docs/conventions.md`](./docs/conventions.md).
- Architecture decisions: [`docs/adr/`](./docs/adr/). Adding a top-level
  dependency or build tool needs an ADR.
- Validation is Zod, everywhere. UI strings are bilingual (pl + en) from the
  start.

## Honesty

If a test was skipped, a UI change wasn't visually verified, or a ticket is only
half-done — say so, in the PR and in the ticket. A half-done ticket stays
`in_progress`, never `done`.

## Security

Found a vulnerability? See [`SECURITY.md`](./SECURITY.md). Don't open a public
issue for it.
