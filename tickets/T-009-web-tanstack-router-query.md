---
id: T-009
title: Web — TanStack Router + TanStack Query
status: in_progress
priority: medium
owner: Claude
dependencies: [T-007]
labels: [web, routing, data]
created_at: 2026-06-13
updated_at: 2026-06-16
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

- [x] TanStack Router is installed and configured. Decision: file-based vs
      code-based is recorded in `apps/web/AGENTS.md` with a one-paragraph
      rationale.
- [x] TanStack Query is installed; `QueryClient` is configured with sensible
      defaults (`staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false`).
- [x] A devtools panel is available in development and tree-shaken in
      production.
- [x] One example route `/healthz` calls `GET /healthz` on the API and shows
      "OK" or "down" based on the response. This proves both libraries are
      wired up.
- [x] `apps/web/src/lib/queryClient.ts` and
      `apps/web/src/lib/router.ts` are clearly separated.
- [x] Conventions in `apps/web/AGENTS.md`: - Feature folders own their own `routes.ts` and `queries.ts`. - Server state lives in TanStack Query; component-local state in
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

## Notes

- **Routing style: code-based** (not file-based). ADR-0005 explicitly chose
  "code-based routing with strong types", and code-based keeps the toolchain
  minimal — no Vite router plugin and no generated `routeTree.gen.ts` to
  bootstrap and keep in sync. Routes are plain modules assembled in
  `src/lib/router.ts`. Rationale recorded in `apps/web/AGENTS.md`.
- **API call uses a same-origin relative fetch (`/healthz`) + a Vite dev
  proxy**, not a direct cross-origin call to `http://localhost:3001`. The API
  sets no CORS headers, so a direct cross-origin fetch from `:5173` would be
  blocked by the browser and the "OK" state would be unreachable in dev. The
  proxy (`vite.config.ts` → `server.proxy`) forwards `/healthz` to the API. A
  configurable API base URL belongs to the typed client (T-011), so no
  `VITE_API_URL`/env module was added here (would be speculative).
- **Router + Query are integrated**: the root route is created with
  `createRootRouteWithContext` so `queryClient` is on the router context; the
  `/healthz` route warms the cache in a `loader` via
  `context.queryClient.prefetchQuery` (non-throwing — a failed request leaves the
  query in an error state rather than tripping the router error boundary), and
  the component reads with `useQuery` and renders the loading / "down" / "OK"
  states. This is the canonical pattern future feature routes mimic.
- **Feature-folder convention seeded**: `src/features/health/` owns `routes.ts`,
  `queries.ts`, and its component — the reference example for future features.
  New `src/` directories added `@/features` and `@/routes` aliases across
  `vite.config.ts`, `vitest.config.ts`, and `tsconfig.json`.
- **i18n debt**: the `OK` / `down` / `…` status labels are hardcoded JSX
  placeholders, consistent with the existing pre-T-010 scaffold strings in
  `App.tsx`. They will be routed through i18next in T-010.
- **Browser UI not visually verified**: `agent-browser` / Chrome are not
  available in this execution environment. The `/healthz` request path was
  verified end-to-end at the HTTP level through the Vite proxy (API up → 200
  `{"status":"ok"}`; API down → proxy 502). The rendered states are covered by
  tests instead: `HealthStatus.test.tsx` asserts the component renders "OK" and
  "down" (a 503 example), and `routes.test.ts` asserts the route `loader`
  resolves without throwing on a down API and leaves the query in an error state
  (so the component renders "down" through the real route, not the router error
  boundary).

- **Out-of-scope security fix (requested on this branch)**: Dependabot flagged
  vulnerable `esbuild` (GHSA-gv7w-rqvm-qjhr high, GHSA-67mh-4wv8-2f99 moderate)
  pulled transitively by `drizzle-kit` in `packages/db` (a dev-only `esbuild@0.18.20`
  via the deprecated `@esbuild-kit/*` loader, plus `esbuild@0.25.12`). Vite 8 and
  tsx already resolve the patched `esbuild@0.28.1`. Fixed repo-wide with a pnpm
  override `"esbuild@<0.28.1": "^0.28.1"` in the root `package.json` (pnpm 9 reads
  overrides from `package.json`, not `pnpm-workspace.yaml`). Not part of the
  TanStack work; called out here for traceability.

## References

- ADR: [ADR-0005](../docs/adr/0005-vite-react-no-nextjs.md)
- <https://tanstack.com/router>
- <https://tanstack.com/query>
