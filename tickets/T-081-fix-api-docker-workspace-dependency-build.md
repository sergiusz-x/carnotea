---
id: T-081
title: Fix API Docker workspace dependency build
status: done
priority: high
size: S
spec_version: 1
owner: codex
dependencies: []
labels: [ci, deploy, docker]
created_at: 2026-07-04
updated_at: 2026-07-04
closed_at: 2026-07-04
---

# T-081 — Fix API Docker workspace dependency build

## Goal

Make the `Deploy` workflow build the API container successfully on `main`.

## Context

After PR #95 merged, `main` CI/schema/ticket checks passed, but the `Deploy` workflow failed while building `apps/api/Dockerfile`. The container build ran `pnpm --filter @carnotea/api build`, which did not build workspace dependency packages (`@carnotea/db`, `@carnotea/shared`) before TypeScript resolved their exported `dist` declarations.

## Contract

Change only the API Docker build command so it builds the API package and its workspace dependency graph inside the builder stage.

### Endpoints / routes

_n/a_

### Request / response shapes

_n/a_

### Provides

- API Docker builder stage has compiled workspace dependency outputs before compiling `@carnotea/api`.

### Consumes

- Existing pnpm workspace filter graph syntax.

## Acceptance criteria

- [x] `apps/api/Dockerfile` builds `@carnotea/api` together with its workspace dependencies.
- [x] Relevant local validation commands pass.
- [x] GitHub `Deploy` workflow passes after merge to `main`.

## Test matrix

| Case                          | Input                    | Expected                                                           |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------ |
| Docker build dependency graph | API Docker builder stage | `@carnotea/db` and `@carnotea/shared` are built before API compile |

## Files to touch

- `apps/api/Dockerfile`
- `tickets/INDEX.md`
- `tickets/T-081-fix-api-docker-workspace-dependency-build.md`

## Out of scope

- Changing runtime image shape.
- Changing deploy credentials or registry settings.

## Implementation notes

Use `pnpm --filter @carnotea/api... build` so pnpm includes the selected package and its dependencies.

## Verification

- `pnpm --filter @carnotea/api build` → passes
- `pnpm format:check` → passes
- `pnpm lint:tickets` → passes
- GitHub `Deploy` on `main` → passes

## References

- Related ticket: T-080
- Failed run: https://github.com/sergiusz-x/carnotea/actions/runs/28700779060
