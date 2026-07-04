---
id: T-080
title: Fix main CI after docker-compose merge
status: done
priority: high
size: S
spec_version: 1
owner: codex
dependencies: [T-012, T-014]
labels: [ci, web, api, docker]
created_at: 2026-07-04
updated_at: 2026-07-04
closed_at: 2026-07-04
---

# T-080 — Fix main CI after docker-compose merge

## Goal

Restore green `main` checks after the T-014 docker-compose merge.

## Context

The `main` push for merge commit `2a2149d` fails in GitHub Actions:

- `CI` and `API schema` fail during `@carnotea/web` build because
  `vite-plugin-pwa` has neither matching precache output nor runtime caching.
- `Deploy` fails while building `apps/api/Dockerfile` because it copies tooling
  package manifests from stale `tooling/*-config/` paths.
- Once PWA generation is fixed, the web build also exposes a missing
  `apps/web/src/features/vehicles/vehicle-usage.ts` module imported by the
  vehicle detail hub.
- The API build then fails on a dead `class-validator` import and Fastify plugin type incompatibility in bootstrap security middleware.

## Contract

Fix the existing build configuration only.

### Endpoints / routes

_n/a_

### Request / response shapes

_n/a_

### Provides

- A web production build that can generate the baseline service worker.
- An API Dockerfile that copies the current workspace package manifest paths.

### Consumes

- T-012 PWA baseline in `apps/web/vite.config.ts`.
- T-014 API Docker image in `apps/api/Dockerfile`.

## Acceptance criteria

- [x] `pnpm --filter @carnotea/web build` succeeds.
- [x] `docker build -f apps/api/Dockerfile .` reaches the source-copy/build
      stages instead of failing on missing `tooling/*-config/package.json`
      paths.
- [x] `pnpm build` succeeds locally.
- [x] Vehicle detail hub resolves its fuel/charging support helper import.
- [x] API build typechecks without `class-validator` or Fastify plugin register errors.

## Test matrix

| Case                 | Input                     | Expected                           |
| -------------------- | ------------------------- | ---------------------------------- |
| Web production build | `pnpm --filter web build` | Vite build and PWA generation pass |
| API Dockerfile paths | `apps/api/Dockerfile`     | Tooling package manifests resolve  |

## Files to touch

- `apps/web/vite.config.ts`
- `apps/api/Dockerfile`
- `apps/web/src/features/vehicles/vehicle-usage.ts`
- `apps/api/src/audit-logging.interceptor.ts`
- `apps/api/src/audit-logging.interceptor.spec.ts`
- `apps/api/src/main.ts`
- `tickets/T-080-fix-main-ci-after-docker-compose-merge.md`
- `tickets/INDEX.md`

## Out of scope

- Offline-first caching, background sync, or push notifications.
- Docker image redesign beyond the broken manifest paths.

## Implementation notes

- PR opened: https://github.com/sergiusz-x/carnotea/pull/95
- Local Docker engine was unavailable, so Docker verification is limited to fixing the exact stale manifest paths reported by GitHub Actions and full workspace build validation.

- Keep the PWA baseline intentionally minimal.
- The current tooling workspace package directories are `tooling/eslint`,
  `tooling/prettier`, `tooling/typescript`, and `tooling/vitest`.

## Verification

- `pnpm --filter @carnotea/web build` → pass.
- `pnpm build` → pass.
- `docker build -f apps/api/Dockerfile .` → pass or proceed beyond the stale
  manifest-copy failure if Docker is unavailable locally.

## References

- Related tickets: T-012, T-014
