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

## OpenAPI + Zod convention (T-005)

**No endpoint ships without Zod-typed input and output.** Every route must call
`zodRoute(...)` at module level so it appears in the generated OpenAPI document.

### `zodRoute` helper

Located at `src/lib/openapi/zod-route.ts`, exported via `src/lib/openapi/index.ts`.

```typescript
import { z } from 'zod';
import { zodRoute, ZodValidationPipe } from '../lib/openapi/index.js';

// 1. Register route + schemas (module-level, runs on import).
const createThingRoute = zodRoute({
  method: 'post',
  path: '/things',            // OpenAPI path format — {param} not :param
  operationId: 'createThing',
  tags: ['Things'],
  request: {
    body: z.object({ name: z.string() }),
  },
  responses: {
    '201': { description: 'Created', schema: z.object({ id: z.string() }) },
    '400': { description: 'Invalid request body' },
  },
});

// 2. Use ZodValidationPipe to validate the body at runtime.
@Controller()
export class ThingsController {
  @Post('things')
  create(@Body(new ZodValidationPipe(createThingRoute.request!.body!)) body: { name: string }) {
    ...
  }
}
```

`zodRoute` is a plain function (no NestJS imports) so it works regardless of
the HTTP framework. `ZodValidationPipe` is the NestJS adapter — it throws
`BadRequestException` with `{ code: 'VALIDATION_ERROR', message, issues }` on
invalid input. The `issues` shape matches `ErrorResponseSchema` from
`@carnotea/shared`.

### Endpoints

```bash
curl localhost:3001/openapi.json   # OpenAPI 3.1 document
curl localhost:3001/docs           # Swagger UI
```

## Auth (better-auth, T-006)

better-auth (ADR-0004) owns email/password auth. It is mounted and consumed like
this:

- **Handler:** `AuthModule` mounts better-auth's web handler at `/api/auth/*` on
  the underlying Fastify instance (an encapsulated plugin with a raw-body parser,
  so the rest of the API keeps default JSON parsing). The instance is built by
  `createAuth(db, { secret, baseURL })` in `src/auth/auth.ts` and provided under
  the `AUTH` token.
- **Protected routes:** every route under `/api/*` except `/api/auth/*` requires
  an authenticated session. Enforce it with `@UseGuards(AuthGuard)` —
  `AuthGuard` reads the session via better-auth and populates a typed
  `request.user` (`{ id, email }`), or throws `401`. Read it in a handler with
  the `@CurrentUser()` decorator.
- **Identity = ownership id.** `vehicle_diary.users.id` IS the better-auth user id
  (same UUID — see `packages/db/AGENTS.md`), so `request.user.id` is the value to
  scope queries by; no profile lookup is needed to get the owner id.
- **Profile creation:** a better-auth `databaseHooks.user.create.after` hook
  mirrors each new auth user into the domain `users` row (idempotent). `GET /me`
  returns that profile.
- **Env:** `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are required (see
  `src/config/env.ts` and root `.env.example`).

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

- OAuth providers, 2FA, passkeys, password reset — follow-ups to T-006.
- Docker image for the API — T-014.
