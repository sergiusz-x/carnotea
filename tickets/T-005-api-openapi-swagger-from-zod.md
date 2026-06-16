---
id: T-005
title: API — OpenAPI / Swagger generated from Zod
status: done
priority: medium
owner: claude
dependencies: [T-004]
labels: [api, contracts]
created_at: 2026-06-13
updated_at: 2026-06-16
closed_at: 2026-06-16
---

# T-005 — API: OpenAPI / Swagger generated from Zod

## Goal

Expose `GET /docs` (Swagger UI) and `GET /openapi.json` on the API, both driven
by Zod schemas declared per route. Add a helper that lets a controller declare
its input/output shape once and have the OpenAPI document, the runtime
validator, and the TS type all flow from it.

## Context

ADR-0003 makes the OpenAPI document the contract between API and any client.
This ticket implements the wiring. After it lands, every new endpoint added in
a feature ticket gets its schema documented automatically — and the web
client's typed API codegen (T-011) can consume it.

## Acceptance criteria

- [x] A small `zodRoute` (or equivalent) helper is exported from
      `apps/api/src/lib/openapi` that: - takes Zod schemas for `params`, `query`, `body`, `response`, - validates the request at runtime (via `ZodValidationPipe`), - registers the route in the OpenAPI document.
- [x] `GET /openapi.json` returns a valid OpenAPI 3.1 document.
- [x] `GET /docs` serves Swagger UI for that document.
- [x] The two existing healthcheck endpoints (T-004) are migrated to use the
      helper so they appear in the document.
- [x] A test verifies that a malformed body to a wired endpoint returns 400
      with a useful error payload (`{ code, message, issues }`).
- [x] `apps/api/AGENTS.md` documents the helper and the convention "no endpoint
      ships without Zod-typed input and output".

## Files to touch

- `apps/api/src/lib/openapi/**`
- `apps/api/src/healthcheck/**` (migrate to helper)
- `apps/api/AGENTS.md`

## Out of scope

- Generating the typed client on the web side (T-011).
- Auth-related security schemes — added in T-006.

## Implementation notes

- Use `@asteasolutions/zod-to-openapi` for Zod → OpenAPI conversion.
- The helper should _not_ require NestJS decorators — keep it functional so the
  same approach works if we ever swap NestJS for plain Fastify.
- Error response envelope: `{ code: string; message: string; issues?: ZodIssue[] }`.
  Codify this in a shared Zod schema in `@carnotea/shared`.

## Notes

- `@asteasolutions/zod-to-openapi@8.5.0` was chosen (supports Zod v4 peer dep
  `^4.0.0`); covered by ADR-0003 which already mentions `zod-to-openapi or equivalent`.
- `RouteParameter` (the `ZodObject | ZodPipe` union) is not exported from the library.
  `zod-route.ts` uses `as unknown as` cast so the public `ZodRouteSpec` interface can
  accept `ZodType` — callers must supply `z.object({...})` for params/query.
- `GET /docs` serves Swagger UI via unpkg CDN (no extra npm dep). The doc endpoint
  itself is `GET /openapi.json` which the UI loads at runtime.
- The OpenAPI document is lazily generated and cached on first `GET /openapi.json`
  request — registry is fully populated by then because all controllers are imported
  during `NestFactory.create()`.
- The `zodRoute` call is at module level (top-level side-effect) in each controller
  file. ESM module cache ensures each route is registered exactly once.

## References

- ADR: [ADR-0003](../docs/adr/0003-rest-openapi-zod.md)
- <https://github.com/asteasolutions/zod-to-openapi>
