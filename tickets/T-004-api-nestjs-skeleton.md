---
id: T-004
title: API skeleton — NestJS app + healthcheck + DB ping
status: ready
priority: high
owner: ~
dependencies: [T-001, T-002, T-003]
labels: [bootstrap, api]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-004 — API skeleton: NestJS app + healthcheck + DB ping

## Goal

Scaffold `apps/api` as a minimal NestJS application with a single
`GET /healthz` endpoint that returns `{ status: 'ok' }` and a `GET /readyz`
endpoint that also verifies the database is reachable.

## Context

We need a runnable backend before any feature work can begin. This ticket
delivers the smallest possible NestJS app wired into our workspace packages,
proves that:

- the app boots,
- it imports `@carnotea/db` and can run `SELECT 1`,
- it imports `@carnotea/shared`,
- `pnpm dev` serves it on the configured port.

No business endpoints, no auth, no Swagger yet.

## Acceptance criteria

- [ ] `apps/api/` exists as `@carnotea/api`, NestJS-based.
- [ ] tsconfig extends `@carnotea/tsconfig/node.json`.
- [ ] ESLint extends the `node` config from `@carnotea/eslint-config`.
- [ ] `pnpm --filter @carnotea/api dev` runs the app on `API_PORT` (default
      3001) and hot-reloads on file change.
- [ ] `GET /healthz` returns 200 with `{ status: 'ok' }`.
- [ ] `GET /readyz` returns 200 with `{ status: 'ok', db: 'ok' }` when the DB
      is reachable, 503 otherwise.
- [ ] The app reads `DATABASE_URL` from `process.env`; missing env vars cause
      a startup error with a clear message.
- [ ] A first Vitest test covers the healthcheck handler.
- [ ] `apps/api/AGENTS.md` exists with API-specific rules.

## Files to touch

- `apps/api/**`
- `turbo.json` (ensure `dev` and `build` pipelines pick it up)
- Root `.env.example` already covers the env vars; verify no drift.

## Out of scope

- Authentication (T-006).
- Swagger / OpenAPI endpoint (T-005).
- Any vehicle / fuel-log / service-record routes.
- Docker image for the API (T-014).

## Implementation notes

- Prefer the Fastify adapter for NestJS — it's measurably faster and our
  routes will be small and synchronous-ish. Document the choice in
  `apps/api/AGENTS.md`. If you choose Express instead, document why.
- Logging: `nestjs-pino` for structured JSON logs.
- Config: `@nestjs/config` reading from `process.env`; validate the shape with
  a Zod schema at boot.
- Healthcheck: `@nestjs/terminus` is overkill for just `/healthz` and `/readyz`
  — write the two controllers by hand.

## References

- ADR: [ADR-0003](../docs/adr/0003-rest-openapi-zod.md)
- NestJS: <https://docs.nestjs.com>
