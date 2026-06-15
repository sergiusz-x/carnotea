---
id: T-005
title: API — OpenAPI / Swagger generated from Zod
status: done
priority: medium
owner: claude
dependencies: [T-004]
labels: [api, contracts]
created_at: 2026-06-13
updated_at: 2026-06-15
closed_at: 2026-06-15
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

- [ ] A small `zodRoute` (or equivalent) helper is exported from
      `apps/api/src/lib/openapi` that: - takes Zod schemas for `params`, `query`, `body`, `response`, - validates the request at runtime, - registers the route in the OpenAPI document.
- [ ] `GET /openapi.json` returns a valid OpenAPI 3.1 document.
- [ ] `GET /docs` serves Swagger UI for that document.
- [ ] The two existing healthcheck endpoints (T-004) are migrated to use the
      helper so they appear in the document.
- [ ] A test verifies that a malformed body to a wired endpoint returns 400
      with a useful error payload (`{ code, message, issues }`).
- [ ] `apps/api/AGENTS.md` documents the helper and the convention "no endpoint
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

## References

- ADR: [ADR-0003](../docs/adr/0003-rest-openapi-zod.md)
- <https://github.com/asteasolutions/zod-to-openapi>
