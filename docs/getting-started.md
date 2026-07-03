# Getting started

This page walks you through setting up CarNotea locally. It assumes you are
either a human developer or an AI agent picking up your first ticket.

## 1. Install prerequisites

| Tool    | Version      | How to check       |
| ------- | ------------ | ------------------ |
| Node.js | 24 or newer  | `node --version`   |
| pnpm    | 9.x or newer | `pnpm --version`   |
| Docker  | any recent   | `docker --version` |
| Git     | any recent   | `git --version`    |

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

It also starts **Mailpit** — a local email inbox that captures all outgoing
transactional emails (verification, password reset) without sending real mail.
View captured emails in your browser at **http://localhost:8025**.

Useful follow-ups:

```bash
docker compose ps               # check status
docker compose logs -f postgres # tail logs
docker compose logs -f mailpit  # tail Mailpit logs
pnpm db:down                    # stop, keep data
pnpm db:reset                   # nuke the volume and start fresh
```

## 4. Apply the schema

```bash
pnpm db:migrate
```

This runs `drizzle-kit migrate` for `@carnotea/db`, applying all pending
migrations in order — tables, indexes, constraint triggers, and lookup seed
data. The database is ready to use immediately after.

To regenerate migrations after a schema change:

```bash
pnpm db:generate   # diffs src/schema/ and writes a new SQL migration file
pnpm db:migrate    # applies pending migrations
```

See `packages/db/AGENTS.md` for the full schema-change workflow.

## 5. Run the apps

```bash
pnpm dev          # runs all dev tasks in parallel via Turborepo
# or, focused:
pnpm --filter @carnotea/api dev    # NestJS API on API_PORT (default 3001)
pnpm --filter @carnotea/web dev    # Vite dev server on http://localhost:5173
```

`apps/web` is scaffolded (T-007): `pnpm --filter @carnotea/web dev` serves the
landing page on http://localhost:5173.

The API (`apps/api`) is live as of T-004. Health probes:

```bash
curl localhost:3001/healthz   # {"status":"ok"}
curl localhost:3001/readyz    # {"status":"ok","db":"ok"} or 503
```

Note: workspace packages (`@carnotea/db`, `@carnotea/shared`) must be built
before the API can run. `pnpm build` (or `pnpm --filter @carnotea/api build`)
handles this automatically via Turborepo's `^build` dependency chain.

When an API route contract changes, regenerate the committed web client types
while the API is running:

```bash
pnpm --filter @carnotea/web codegen:api
pnpm --filter @carnotea/web codegen:api:check
```

The check regenerates `apps/web/src/lib/api/schema.d.ts` and fails when the working tree differs, matching the CI freshness check.

### Development flows

You can develop Carnotea using either **pnpm dev** (local development) or **docker compose up** (full stack with Docker).

#### pnpm dev (local development)

This runs the API and web apps in development mode using Turbopack.

```bash
pnpm dev          # runs all dev tasks in parallel via Turborepo
# or, focused:
pnpm --filter @carnotea/api dev    # NestJS API on API_PORT (default 3001)
pnpm --filter @carnotea/web dev    # Vite dev server on http://localhost:5173
```

#### docker compose up (full stack)

This starts PostgreSQL, Mailpit, API, and Web (production build) via Docker Compose.

```bash
docker compose up -d   # starts postgres, mailpit, api, web
# API will wait for postgres to be healthy before starting
# Web serves the production-built static assets via nginx
```

You can still run migrations and other workspace commands while the containers are running:

```bash
pnpm db:migrate      # runs against the postgres container
pnpm build           # builds all packages (if needed)
```

## 6. Working day-to-day

| Goal             | Command                         |
| ---------------- | ------------------------------- |
| Type-check       | `pnpm typecheck`                |
| Lint             | `pnpm lint`                     |
| Format           | `pnpm format`                   |
| Run all tests    | `pnpm test`                     |
| Run a single app | `pnpm --filter <name> <script>` |

CI (GitHub Actions) runs the same commands on every PR — see
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

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

## 8. Adding UI components (shadcn/ui)

shadcn/ui components are copied into `apps/web/src/components/ui/` rather than
installed as a package. To add a new one:

```bash
cd apps/web
pnpm dlx shadcn@latest add <component-name>   # e.g. input, dialog, select
```

The CLI reads `apps/web/components.json` for paths and configuration. See
`apps/web/AGENTS.md` for the component location conventions.

## 9. Committing changes

Instead of staging and committing manually, use `/smart-commit` (Claude Code)
or the `smart-commit` Codex skill. It will:

1. Fetch origin and warn if your branch is behind.
2. Read all uncommitted changes.
3. Propose a split into logically coherent commits with Conventional Commit
   messages.
4. Wait for your approval before writing anything to git history.
5. Create the commits in sequence.

To then push and open a PR, run `/ship-pr`.

## 10. Where to look next

- **Architecture overview**: [`docs/architecture.md`](./architecture.md)
- **Conventions**: [`docs/conventions.md`](./conventions.md)
- **Tech-stack decisions**: [`docs/adr/`](./adr/)
- **How to work on tickets**:
  [`docs/agents/working-with-tickets.md`](./agents/working-with-tickets.md)
- **What to do first**: [`tickets/INDEX.md`](../tickets/INDEX.md)
