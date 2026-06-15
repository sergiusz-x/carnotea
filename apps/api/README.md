# @carnotea/api

The CarNotea HTTP API — a NestJS (Fastify) application. This package currently
ships only the health/readiness probes; feature endpoints land in later tickets.

## Running

```bash
# From the repo root, with a local Postgres available (pnpm db:up):
pnpm --filter @carnotea/api dev
```

The dev server runs on `API_PORT` (default `3001`) and hot-reloads on change.

## Endpoints

| Method | Path       | Response                                                      |
| ------ | ---------- | ------------------------------------------------------------- |
| GET    | `/healthz` | `200 { "status": "ok" }` — process is up                      |
| GET    | `/readyz`  | `200 { "status": "ok", "db": "ok" }`; `503` if the DB is down |

## Environment

Read from `process.env` and validated by Zod at boot (`src/config/env.ts`).
Missing or invalid values abort startup with a clear error.

| Variable       | Required | Default       | Purpose                               |
| -------------- | -------- | ------------- | ------------------------------------- |
| `DATABASE_URL` | yes      | —             | Postgres DSN for `SELECT 1` readiness |
| `API_PORT`     | no       | `3001`        | HTTP listen port                      |
| `API_HOST`     | no       | `0.0.0.0`     | HTTP listen host                      |
| `NODE_ENV`     | no       | `development` | Toggles pretty logging                |

See the root [`.env.example`](../../.env.example) for the full template.

## Conventions

Area rules live in [`AGENTS.md`](./AGENTS.md). Stack rationale:
[ADR-0003](../../docs/adr/0003-rest-openapi-zod.md) (REST + Zod) and
[ADR-0010](../../docs/adr/0010-api-compiler-swc.md) (SWC compiler).
