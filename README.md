# CarNotea

CarNotea is a private vehicle-diary PWA for tracking cars, refuels, charging,
services, parts, issues, expenses, and reminders.

The app is intentionally small: a personal logbook, not a fleet manager or
workshop ERP.

## Current Shape

- `apps/api` — NestJS REST API with Zod-registered OpenAPI routes and better-auth.
- `apps/web` — Vite + React PWA shell with TanStack Router/Query and i18n.
- `packages/db` — Drizzle schema, migrations, and DB factory.
- `packages/shared` — shared Zod schemas, constants, and route paths.
- `tooling/*` — shared build, lint, format, TypeScript, and test config packages.

Canonical docs:

- Architecture: [`docs/architecture.md`](./docs/architecture.md)
- Decisions: [`docs/adr/`](./docs/adr/)
- Tech stack: [`docs/tech-stack.md`](./docs/tech-stack.md)
- Setup: [`docs/getting-started.md`](./docs/getting-started.md)

## Quick Start

Prerequisites: Node.js 24+, pnpm 9+, and Docker.

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm --filter @carnotea/api dev
pnpm --filter @carnotea/web dev
```

See [`docs/getting-started.md`](./docs/getting-started.md) for the full local
workflow.

## Working Here

Work is ticket-driven. Start with [`AGENTS.md`](./AGENTS.md) and
[`tickets/INDEX.md`](./tickets/INDEX.md). The validation commands and agent
workflow live there; keep this README as a small entry point.

## License

Private project, all rights reserved. No license granted unless explicitly stated.
