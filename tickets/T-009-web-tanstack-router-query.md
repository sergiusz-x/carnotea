---
id: T-009
title: Web — TanStack Router + TanStack Query
status: ready
priority: medium
owner: ~
dependencies: [T-007]
labels: [web, routing, data]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-009 — Web: TanStack Router + TanStack Query

## Goal

Wire TanStack Router (code-based or file-based — decide and document) and
TanStack Query into `apps/web`. Provide a `QueryClientProvider`, a
`RouterProvider`, a single example route, and a single example query.

## Context

The web app needs routing and a server-state cache before any feature work.
This ticket installs both, exposes the standard patterns, and provides one
working example that future tickets will mimic.

## Acceptance criteria

- [ ] TanStack Router is installed and configured. Decision: file-based vs
      code-based is recorded in `apps/web/AGENTS.md` with a one-paragraph
      rationale.
- [ ] TanStack Query is installed; `QueryClient` is configured with sensible
      defaults (`staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false`).
- [ ] A devtools panel is available in development and tree-shaken in
      production.
- [ ] One example route `/healthz` calls `GET /healthz` on the API and shows
      "OK" or "down" based on the response. This proves both libraries are
      wired up.
- [ ] `apps/web/src/lib/queryClient.ts` and
      `apps/web/src/lib/router.ts` are clearly separated.
- [ ] Conventions in `apps/web/AGENTS.md`: - Feature folders own their own `routes.ts` and `queries.ts`. - Server state lives in TanStack Query; component-local state in
      `useState`. No Zustand/Redux/etc. unless added by a future ADR.

## Files to touch

- `apps/web/src/lib/**`
- `apps/web/src/routes/**` (or `src/routeTree.gen.ts` if file-based)
- `apps/web/AGENTS.md`

## Out of scope

- Typed API client (T-011) — for the example, a hand-written fetch is fine.
- Auth routes / guards (separate ticket once T-006 is done).

## Implementation notes

- If you go file-based: configure the vite plugin and check the generated
  `routeTree.gen.ts` into git so the next agent doesn't have to bootstrap to
  understand routing.
- If code-based: define the routes in `src/router.ts` and keep imports flat.

## References

- ADR: [ADR-0005](../docs/adr/0005-vite-react-no-nextjs.md)
- <https://tanstack.com/router>
- <https://tanstack.com/query>
