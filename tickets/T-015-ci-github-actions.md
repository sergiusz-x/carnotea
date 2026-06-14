---
id: T-015
title: CI — GitHub Actions (lint, typecheck, test, build)
status: ready
priority: medium
owner: ~
dependencies: [T-001]
labels: [tooling, ci, repo]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-015 — CI: GitHub Actions (lint, typecheck, test, build)

## Goal

Add a GitHub Actions workflow that runs lint, format check, typecheck, tests,
build, and the workspace consistency check on every PR and on pushes to `main`,
using Turborepo caching.

## Context

The governance files (`.github/`) already exist; CI was deferred until there was
something to build. Once `tooling/*` (T-001) lands, the validation commands in
the root `AGENTS.md` are real and CI can enforce them.

We follow the create-t3-turbo CI shape: a reusable composite setup action under
`tooling/github/setup`, then parallel jobs.

## Acceptance criteria

- [ ] `tooling/github/setup/action.yml` is a composite action that checks out,
      installs pnpm + Node (from `.nvmrc`), and runs `pnpm install`.
- [ ] `.github/workflows/ci.yml` runs on `pull_request` and `push` to `main`,
      with `concurrency` cancelling superseded runs on non-main refs.
- [ ] Jobs (parallel where possible): `lint` (incl. `pnpm lint:ws`),
      `format` (`pnpm format:check`), `typecheck`, `test`, `build`.
- [ ] Turborepo remote caching is wired via repo secrets/vars but degrades
      gracefully when they're absent (forks).
- [ ] The workflow copies `.env.example` to `.env` so commands needing env vars
      don't fail.
- [ ] CI passes green on a branch that contains only the bootstrap +
      `tooling/*`.
- [ ] `docs/getting-started.md` mentions that CI mirrors the local validation
      commands.

## Files to touch

- `.github/workflows/ci.yml`
- `tooling/github/setup/action.yml`
- `docs/getting-started.md`

## Out of scope

- Deploy / release pipelines (a later infra ticket).
- E2E (Playwright) in CI — add once `apps/web` has flows worth testing.
- Required-status-check branch protection (configured in repo settings, not
  code).

## Implementation notes

- Pin action versions (`actions/checkout@v5`, `pnpm/action-setup`,
  `actions/setup-node` with `cache: pnpm`).
- Keep jobs small and parallel; let Turborepo skip unaffected packages.
- `TURBO_TEAM` / `TURBO_TOKEN` as `vars` / `secrets`; guard so forks still run.

## References

- ADR: [ADR-0001](../docs/adr/0001-monorepo-turborepo.md)
- Reference: create-t3-turbo `.github/workflows/ci.yml` + `tooling/github/setup`.
