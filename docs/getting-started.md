# Getting started

This page walks you through setting up CarNotea locally. It assumes you are
either a human developer or an AI agent picking up your first ticket.

## 1. Install prerequisites

| Tool    | Version       | How to check         |
| ------- | ------------- | -------------------- |
| Node.js | 24 or newer    | `node --version`     |
| pnpm    | 9.x or newer  | `pnpm --version`     |
| Docker  | any recent    | `docker --version`   |
| Git     | any recent    | `git --version`      |

If you use `nvm` or `fnm`, run `nvm use` (the version is pinned in `.nvmrc`).

## 2. Clone and bootstrap

```bash
git clone <repo-url> carnotea
cd carnotea
cp .env.example .env
pnpm install
```

The install step pulls workspace dependencies for every package and links them
together via pnpm workspaces.

## 3. Start the database

```bash
pnpm db:up
```

This runs `docker compose up -d` and starts a PostgreSQL 16 container on port
**5433** (so it doesn't conflict with a system-wide Postgres on 5432). The data
lives in a Docker volume named `carnotea_postgres_data`.

Useful follow-ups:

```bash
docker compose ps               # check status
docker compose logs -f postgres # tail logs
pnpm db:down                    # stop, keep data
pnpm db:reset                   # nuke the volume and start fresh
```

## 4. Apply the schema

> ⚠️ The current `sql/` layout is the legacy university structure. Ticket
> **T-002** moves it under `packages/db/` and introduces proper versioned
> migrations. Until that ticket lands, apply the schema manually:

```bash
docker compose exec -T postgres \
  psql -U carnotea -d carnotea \
  -f /repo/sql/00_schema_reset.sql

# Repeat for 01_tables.sql, 02_indexes.sql, 03_functions.sql,
# 04_triggers.sql, 05_procedures.sql, 06_views.sql, 07_seed_data.sql
```

(Once T-002 lands you will just run `pnpm db:migrate`.)

## 5. Run the apps

Once `apps/api` and `apps/web` exist (their respective tickets are completed):

```bash
pnpm dev          # runs all dev tasks in parallel via Turborepo
# or, focused:
pnpm --filter @carnotea/api dev
pnpm --filter @carnotea/web dev
```

Right now this is a no-op because no app has been scaffolded yet. That's
expected, and it is what the initial tickets are for.

## 6. Working day-to-day

| Goal                | Command                              |
| ------------------- | ------------------------------------ |
| Type-check          | `pnpm typecheck`                     |
| Lint                | `pnpm lint`                          |
| Format              | `pnpm format`                        |
| Run all tests       | `pnpm test`                          |
| Run a single app    | `pnpm --filter <name> <script>`      |

## 7. Browser automation (agent-browser)

For AI-assisted UI verification, manual browser exploration, and natural-language
browser control, install [agent-browser](https://github.com/vercel-labs/agent-browser)
globally and download Chrome once:

```bash
npm install -g agent-browser
agent-browser install   # downloads Chrome for Testing (~184 MB, one-time)
```

A project config (`agent-browser.json`) is already committed. Browser session
data is stored in `.agent-browser/` (gitignored — per-developer).

Common workflows once `apps/web` is running:

```bash
agent-browser open http://localhost:5173   # open web app
agent-browser snapshot -i                 # list interactive elements
agent-browser chat                        # natural-language control
```

## 8. Where to look next

- **Architecture overview**: [`docs/architecture.md`](./architecture.md)
- **Conventions**: [`docs/conventions.md`](./conventions.md)
- **Tech-stack decisions**: [`docs/adr/`](./adr/)
- **How to work on tickets**:
  [`docs/agents/working-with-tickets.md`](./agents/working-with-tickets.md)
- **What to do first**: [`tickets/INDEX.md`](../tickets/INDEX.md)
