---
id: T-082
title: Fix Web Docker workspace manifest paths
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

# T-082 — Fix Web Docker workspace manifest paths

## Goal

Make the `Deploy` workflow build the web container successfully on `main`.

## Context

After T-081 fixed the API image build, `Deploy` failed while building the web image because `apps/web/Dockerfile` still copied old tooling package paths such as `tooling/vitest-config/package.json`. The workspace now uses `tooling/vitest`, `tooling/eslint`, `tooling/prettier`, and `tooling/typescript`.

## Contract

Update the web Docker builder stage to copy current workspace manifest paths and build the web package with its workspace dependencies.

### Endpoints / routes

_n/a_

### Request / response shapes

_n/a_

### Provides

- Web Docker builder stage installs from valid workspace manifest paths.
- Web Docker builder stage compiles `@carnotea/web` with its dependency graph.

### Consumes

- Existing pnpm workspace filter graph syntax.

## Acceptance criteria

- [x] `apps/web/Dockerfile` copies current tooling package manifest paths.
- [x] `apps/web/Dockerfile` builds `@carnotea/web` with workspace dependencies.
- [x] Relevant local validation commands pass.
- [x] GitHub `Deploy` workflow passes after merge to `main`.

## Test matrix

| Case                          | Input                    | Expected                                       |
| ----------------------------- | ------------------------ | ---------------------------------------------- |
| Docker manifest copy          | web Docker builder stage | all copied tooling package paths exist         |
| Docker build dependency graph | web Docker builder stage | `@carnotea/shared` is built before web compile |

## Files to touch

- `apps/web/Dockerfile`
- `tickets/INDEX.md`
- `tickets/T-082-fix-web-docker-workspace-manifest-paths.md`

## Out of scope

- Changing nginx runtime behavior.
- Changing deploy credentials or registry settings.

## Implementation notes

Use the same current tooling paths already used by the API Dockerfile.

## Verification

- `pnpm --filter @carnotea/web... build` → passes
- `pnpm format:check` → passes
- `pnpm lint:tickets` → passes
- GitHub `Deploy` on `main` → passes

## References

- Related tickets: T-080, T-081
- Failed run: https://github.com/sergiusz-x/carnotea/actions/runs/28701022814
