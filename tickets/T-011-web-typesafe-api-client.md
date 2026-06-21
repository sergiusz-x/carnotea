---
id: T-011
title: Web — typesafe API client from OpenAPI
status: done
priority: medium
owner: Codex
dependencies: [T-005, T-007, T-009]
labels: [web, api]
created_at: 2026-06-13
updated_at: 2026-06-20
closed_at: 2026-06-20
---

# T-011 — Web: typesafe API client from OpenAPI

## Goal

Generate a TypeScript client from the API's `/openapi.json` and wrap it in a
thin fetch helper that integrates with TanStack Query.

## Context

The API publishes OpenAPI (T-005); the web app needs a typed client so request
and response shapes are checked at compile time. We use `openapi-typescript` to
produce the types and `openapi-fetch` (or a hand-rolled helper) to issue
requests.

## Acceptance criteria

- [x] `pnpm --filter @carnotea/web codegen:api` fetches
      `http://localhost:3001/openapi.json` and writes
      `apps/web/src/lib/api/schema.d.ts`.
- [x] A small `apiClient` is exported from `apps/web/src/lib/api/client.ts`,
      typed against the generated schema.
- [x] The example `/healthz` route from T-009 is migrated to use `apiClient`
      and the type of the response is inferred (no `as any`).
- [x] Request errors (non-2xx) are normalised into a typed error class with
      the shape `{ code, message, issues? }` (matching the API's envelope from
      T-005).
- [ ] The generated `schema.d.ts` is committed. CI fails if it is out of date
      relative to the current API source.

## Files to touch

- `apps/web/src/lib/api/**`
- `apps/web/package.json` (codegen script)
- `apps/web/AGENTS.md` (document the regen workflow)

## Out of scope

- Auth-aware client (`credentials: 'include'`, token refresh) — added once
  T-006's session cookie is in place and the web has auth UI.
- Mocking the API for tests (later ticket).

## Implementation notes

- `openapi-fetch` integrates well with TanStack Query — its responses are
  already discriminated on `data` / `error`.
- Decide whether the schema is fetched live during `dev` or committed and
  regenerated on demand. Default: committed + regen on demand. CI verifies
  freshness by regenerating and diffing.

## References

- ADR: [ADR-0003](../docs/adr/0003-rest-openapi-zod.md)
- <https://openapi-ts.dev>

## Notes

- The generated declaration and fetch client are dependency-free and limited
  to the OpenAPI features used by the current API. This avoids adding runtime
  weight while preserving compile-time response inference.
- The schema is committed and regenerated on demand. The dedicated CI workflow
  starts the built API, regenerates the declaration, and fails on a Git diff.
