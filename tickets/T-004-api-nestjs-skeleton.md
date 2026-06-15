---
id: T-004
title: API skeleton — NestJS app + healthcheck + DB ping
status: done
priority: high
owner: Claude
dependencies: [T-001, T-002, T-003]
labels: [bootstrap, api]
created_at: 2026-06-13
updated_at: 2026-06-15
closed_at: 2026-06-15
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

- [x] `apps/api/` exists as `@carnotea/api`, NestJS-based.
- [x] tsconfig extends `@carnotea/tsconfig/node.json`.
- [x] ESLint extends the `node` config from `@carnotea/eslint-config`.
- [x] `pnpm --filter @carnotea/api dev` runs the app on `API_PORT` (default 3001) and hot-reloads on file change.
- [x] `GET /healthz` returns 200 with `{ status: 'ok' }`.
- [x] `GET /readyz` returns 200 with `{ status: 'ok', db: 'ok' }` when the DB
      is reachable, 503 otherwise.
- [x] The app reads `DATABASE_URL` from `process.env`; missing env vars cause
      a startup error with a clear message.
- [x] A first Vitest test covers the healthcheck handler.
- [x] `apps/api/AGENTS.md` exists with API-specific rules.

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

## Notes

- **Build-tool choice**: Used SWC via `@nestjs/cli` (`nest start --watch` /
  `nest build`). Decision recorded in [ADR-0010](../docs/adr/0010-api-compiler-swc.md).
- **Package consumption**: `@carnotea/db` and `@carnotea/shared` previously
  exported raw TypeScript (`src/index.ts`). T-004 is the first runtime consumer,
  which surfaced the need to compile them. Both packages now have a `build` script
  (`tsc -p tsconfig.build.json`) and export `dist/` with type conditions. The
  Turborepo `build: dependsOn: ^build` pipeline handles ordering automatically.
  `apps/api/turbo.json` overrides the `dev` task to `dependsOn: ^build` so
  workspace packages are compiled before the dev server starts.
- **Env validation**: `@nestjs/config`'s `validate` option calls `validateEnv`
  but its error is absorbed by NestJS v11's module lifecycle and doesn't abort
  startup. Added an eager call to `validateEnv(process.env)` at the top of
  `main.ts` (before `NestFactory.create`) to guarantee a clear exit-1 on bad env.
- **vite pinned to v7**: `unplugin-swc@1.5.9` does not yet support vite 8's Oxc
  transform pipeline. `vite: ^7.3.5` is cataloged; bump when unplugin-swc
  adds Oxc support.
- **Pre-existing format failures**: `pnpm format:check` at workspace level fails
  on pre-existing issues in `packages/db` and `packages/shared` (committed before
  T-004). These are not introduced by this ticket. `apps/api` itself is clean.

## References

- ADR: [ADR-0003](../docs/adr/0003-rest-openapi-zod.md)
- ADR: [ADR-0010](../docs/adr/0010-api-compiler-swc.md)
- NestJS: <https://docs.nestjs.com>
