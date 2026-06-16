# apps/api AGENTS.md

Area-specific rules for `@carnotea/api`. These override the root `AGENTS.md`
for any file under `apps/api/`.

## Stack

- **NestJS 11** with the **Fastify** adapter (`@nestjs/platform-fastify`).
  Fastify is measurably faster than Express and our routes are small; the
  ticket (T-004) prefers it. If a future need forces Express, document why here.
- **SWC** is the build compiler — see [ADR-0010](../../docs/adr/0010-api-compiler-swc.md).
  Dev and build go through `@nestjs/cli` (`nest start --watch` / `nest build`),
  which reads `.swcrc`. Vitest transforms with **native Oxc** (Vite 8) via
  `oxc.decorator` in `vitest.config.ts`, which emits the decorator metadata
  NestJS DI needs — see [ADR-0011](../../docs/adr/0011-vite8-oxc-api-test-transform.md).
- **nestjs-pino** for structured JSON logging (`pino-pretty` only in non-prod).
- **@nestjs/config** loads `process.env`; the shape is validated by a Zod schema
  at boot (`src/config/env.ts`).

## Day-to-day workflow

```bash
pnpm --filter @carnotea/api dev          # nest start --watch on API_PORT (default 3001)
pnpm --filter @carnotea/api build        # nest build → dist/
pnpm --filter @carnotea/api test         # vitest run
pnpm --filter @carnotea/api typecheck    # tsc --noEmit
```

Probes:

```bash
curl localhost:3001/healthz   # {"status":"ok"}
curl localhost:3001/readyz    # {"status":"ok","db":"ok"} or 503 when the DB is down
```

## Rules

- **ESM only.** Relative imports use explicit `.js` extensions (the package is
  `"type": "module"` and tsconfig uses `NodeNext`). SWC keeps specifiers as-is.
- **Validate env with Zod at boot.** Add new variables to `src/config/env.ts`
  and to root `.env.example` in the same change. Missing/invalid env must fail
  startup with a clear message — never read `process.env` ad hoc for config.
- **Inject the database via the `DB` token**, not by type. The provider in
  `src/db/db.module.ts` builds it from `createDb(DATABASE_URL)`; inject with
  `@Inject(DB) db: Db`.
- **No `class-validator`.** Zod only, at the controller boundary (ADR-0003).
- **No `console.log`.** Use the injected pino logger.
- NestJS module classes are empty by design; `no-extraneous-class` is disabled
  for `*.module.ts` in `eslint.config.js`. Do not add placeholder members to
  satisfy lint.

## Out of scope here (own tickets)

- OpenAPI / Swagger at `/docs` — T-005.
- Authentication — T-006.
- Docker image for the API — T-014.
