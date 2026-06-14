# How the agent docs are structured

This page maps the agent-facing documentation in one place so you know what
file to update when something changes.

## Root level

| File        | Audience                 | What it contains                                                                                         |
| ----------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` | Claude                   | One line: `@AGENTS.md`. Pure redirect, no rules of its own (they'd drift).                               |
| `AGENTS.md` | All AI agents and humans | The contract: Always / Ask First / Never / Validation Commands, the Task Router, and the repository map. |
| `README.md` | Anyone visiting the repo | The product, the stack, how to run it.                                                                   |

## `.claude/`

| File / folder             | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `commands/next-ticket.md` | `/next-ticket` skill — find the next unblocked ticket.   |
| `commands/work-ticket.md` | `/work-ticket <id>` skill — execute a ticket end-to-end. |
| `commands/ship-pr.md`     | `/ship-pr` skill — validate, push, open PR.              |

These are Claude Code slash commands.

## `.codex/`

| File / folder                 | Purpose                                               |
| ----------------------------- | ----------------------------------------------------- |
| `skills/next-ticket/SKILL.md` | `next-ticket` skill — find the next unblocked ticket. |
| `skills/work-ticket/SKILL.md` | `work-ticket` skill — execute a ticket end-to-end.    |
| `skills/ship-pr/SKILL.md`     | `ship-pr` skill — validate, push, open PR.            |

Codex project skills, scanned at session start. They mirror the `.claude/`
commands. Both, and any other agent, follow the same workflow from
`docs/agents/ticket-execution.md` — that doc is the source of truth.

## `docs/`

| File / folder                | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `architecture.md`            | One-page mental model of the whole system.              |
| `conventions.md`             | Code style, naming, commits, PR rules.                  |
| `getting-started.md`         | Setting up the repo locally, step by step.              |
| `tech-stack.md`              | Flat reference: every tool we use + why.                |
| `adr/`                       | Accepted architecture decisions, immutable once merged. |
| `agents/`                    | How agents actually do their job here.                  |
| `agents/lessons.md`          | Running log of corrections, written as durable rules.   |
| `agents/ticket-execution.md` | Environment-agnostic ticket execution workflow.         |
| `agents/self-review.md`      | Self-review checklist run before every PR.              |

## `tickets/`

| File           | Purpose                                            |
| -------------- | -------------------------------------------------- |
| `README.md`    | How the ticket system works in general.            |
| `_template.md` | The single template every ticket starts from.      |
| `INDEX.md`     | The list of all tickets, grouped by status.        |
| `T-*.md`       | Individual tickets - one file per ticket, forever. |

## Per-area `AGENTS.md`

Each of these files lives next to the code it describes. They are tiny: rules
that only apply to that area.

- `apps/api/AGENTS.md` - rules specific to the NestJS API.
- `apps/web/AGENTS.md` - rules specific to the Vite + React app.
- `packages/db/AGENTS.md` - rules for migrations, schema, introspection.
- `packages/shared/AGENTS.md` - rules for cross-package Zod schemas + types.
- `tooling/*` - shared ESLint / Prettier / tsconfig presets (build-time only).

If your scoped rule applies everywhere, it belongs in the root `AGENTS.md`. If
it applies only to a few files in a sub-folder, create an `AGENTS.md` next to
those files.

## When to update each file

| Change                              | Update                                                            |
| ----------------------------------- | ----------------------------------------------------------------- |
| New top-level dependency            | `docs/tech-stack.md` + ADR if needed                              |
| New conventional command (`pnpm x`) | `docs/getting-started.md` + `README.md`                           |
| New top-level folder                | `AGENTS.md` repository map + `README.md`                          |
| New cross-cutting rule for code     | `docs/conventions.md`                                             |
| New rule only for one app/package   | That area's `AGENTS.md`                                           |
| Big tech-stack decision             | New ADR                                                           |
| Reversed previous decision          | New ADR superseding the old one                                   |
| Ticket finished                     | Ticket file + `tickets/INDEX.md`                                  |
| Corrected by a human                | `docs/agents/lessons.md` (then promote to `AGENTS.md` if general) |
