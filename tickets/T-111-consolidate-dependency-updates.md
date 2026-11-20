---
id: T-111
title: Consolidate outstanding dependency updates
status: in_progress
priority: high
size: M
spec_version: 1
owner: codex
dependencies: []
labels: [dependencies, security]
created_at: 2026-11-20
updated_at: 2026-11-20
closed_at: ~
---

# T-111 — Consolidate outstanding dependency updates

## Goal

Consolidate the remaining Dependabot pull requests into one verified update.

## Context

PR #186 refreshed vulnerable dependencies. Six open Dependabot PRs propose remaining workspace and GitHub Actions updates.

## Contract

### Endpoints / routes

_n/a — existing routes remain compatible._

### Request / response shapes

_n/a — existing contracts remain compatible._

### Provides

Updated compatible dependencies, lockfile, and GitHub Actions configuration.

### Consumes

Existing workspace manifests, CI checks, and performance budgets.

## Acceptance criteria

- [ ] The remaining Dependabot proposals are incorporated or their differences documented.
- [ ] Workspace validation and performance checks pass with updated dependencies.
- [ ] Remaining security findings and compatibility limitations are documented.

## Test matrix

| Case        | Input                | Expected                             |
| ----------- | -------------------- | ------------------------------------ |
| Workspace   | Updated dependencies | Lint, typecheck, test and build pass |
| Performance | Production web build | Size and Lighthouse checks pass      |
| Security    | Dependency audit     | Findings and affected scope recorded |

## Files to touch

- Workspace manifests and generated lockfile.
- CI configuration and compatibility changes required by updates.

## Out of scope

- Production deployment and data changes.

## Implementation notes

The update incorporates PRs #157, #158, #159, #160 and #166 and the workspace catalog updates in #183. Jest-dom 8 and Vitest 5 are updated together to satisfy their peer dependency. The production audit reports two moderate findings in glob and minimatch through the OpenTelemetry GCP detector. Local size-limit cannot launch Chrome because libatk-1.0.so.0 is absent. One full web test run failed on an asynchronous redirect; the affected test file passed on an isolated rerun.

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm lint:ws`.
- `pnpm --filter @carnotea/web test:size` and `pnpm --filter @carnotea/web test:lighthouse`.
- `pnpm audit` and `pnpm audit --prod`.

## References

- PRs #157, #158, #159, #160, #166, #183.
- T-110 dependency security refresh.
