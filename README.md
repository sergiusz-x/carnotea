# CarNotea

CarNotea is a vehicle diary - a simple, installable web app for tracking everything
that happens with a car: refuels, charges, services, parts, issues, expenses, and
reminders. It is built as a Progressive Web App so it works equally well on a desktop
browser and as an installable app on a phone.

The app is intentionally minimal in scope. It is not a fleet manager, not a workshop
ERP. It is a personal logbook that respects your data and your time.

## Status

Pre-release. The repository currently contains:

- The PostgreSQL schema (tables, indexes, triggers, functions, procedures, views)
  that models the domain.
- The agent-facing scaffolding (documentation, ADRs, ticket system) needed to drive
  the rest of the work.

The application code (API, web client) is not built yet - it is tracked as tickets
under [`tickets/`](./tickets/INDEX.md).

## Tech stack

| Layer        | Choice                                                                  |
| ------------ | ----------------------------------------------------------------------- |
| Monorepo     | pnpm workspaces + Turborepo                                             |
| Database     | PostgreSQL 16 (SQL-first; migrations as raw SQL)                        |
| ORM / query  | Drizzle ORM (schema-as-code in TypeScript, migrations via drizzle-kit)  |
| Backend      | NestJS, REST API, OpenAPI generated from Zod                            |
| Auth         | better-auth                                                             |
| Frontend     | React + Vite + TypeScript                                               |
| Routing      | TanStack Router                                                         |
| Data fetching| TanStack Query                                                          |
| UI           | Tailwind CSS + shadcn/ui                                                |
| Forms        | react-hook-form + Zod                                                   |
| i18n         | Polish + English from day one                                           |
| PWA          | Installable from day one; offline and push notifications later          |
| Deployment   | VPS + docker compose                                                    |

The reasoning behind each choice is captured in [`docs/adr/`](./docs/adr/).

## Repository layout

```
carnotea/
├── apps/                # runnable apps (created by tickets, not present yet)
│   ├── api/             # NestJS HTTP API
│   └── web/             # Vite + React PWA
├── packages/            # shippable libraries (created by tickets, not present yet)
│   ├── db/              # Drizzle schema + SQL migrations + seeds
│   └── shared/          # Zod schemas and shared types
├── tooling/             # build-time config packages, never shipped
│   ├── eslint/          # shared ESLint presets
│   ├── prettier/        # shared Prettier config
│   └── typescript/      # shared tsconfig presets
├── sql/                 # legacy SQL (to be moved into packages/db in T-002)
├── tests/               # legacy SQL integrity audit (to be moved similarly)
├── docs/                # architecture, conventions, ADRs, agent guides
├── tickets/             # markdown-based ticket system that drives the work
├── .claude/             # Claude Code slash commands (/next-ticket, /work-ticket, /ship-pr)
├── .codex/              # Codex skills — same three actions for Codex CLI
├── .github/             # CI, PR/issue templates, CODEOWNERS, dependabot
├── docker-compose.yml   # local Postgres
├── pnpm-workspace.yaml  # workspaces + shared dependency catalog
├── turbo.json
└── tsconfig.base.json
```

For the full rationale see [`docs/architecture.md`](./docs/architecture.md).

## Getting started

> Most things you can do right now are documentation and ticket work. Running the
> apps comes after the first few tickets are completed.

Prerequisites:

- Node.js 24+ (see [.nvmrc](./.nvmrc))
- pnpm 9+
- Docker (for Postgres)

```bash
cp .env.example .env
pnpm install
pnpm db:up    # starts local Postgres on port 5433
```

A full walk-through (including how to apply the SQL schema, how to start an app,
and how the dev loop fits together) lives in
[`docs/getting-started.md`](./docs/getting-started.md).

## Working with this repository

This project is built primarily by AI agents (Claude Code), guided by a set of
markdown documents:

- [`CLAUDE.md`](./CLAUDE.md) - entry point for Claude; a one-line redirect to
  AGENTS.md.
- [`AGENTS.md`](./AGENTS.md) - the contract agents follow: Always / Ask First /
  Never / Validation Commands, plus a Task Router pointing at detailed guides.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) - the human-facing summary of the same
  workflow.
- [`docs/agents/working-with-tickets.md`](./docs/agents/working-with-tickets.md)
  - how a ticket is picked up, executed, and closed.
- [`docs/agents/lessons.md`](./docs/agents/lessons.md) - the repo's running log
  of corrections, written as durable rules.
- [`tickets/INDEX.md`](./tickets/INDEX.md) - the single source of truth for what
  is planned, in progress, and done.

Humans contribute the same way: pick a ticket, follow the conventions, open a PR.
See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`SECURITY.md`](./SECURITY.md).

## License

Private project, all rights reserved. No license granted unless explicitly stated.
