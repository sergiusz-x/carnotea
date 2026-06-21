---
id: T-015
title: CI — GitHub Actions (lint, typecheck, test, build)
status: done
priority: high
owner: Codex
dependencies: [T-001]
labels: [tooling, ci, repo]
created_at: 2026-06-13
updated_at: 2026-06-21
closed_at: 2026-06-21
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

**Bumped to `high` (2026-06-21):** feature PRs (vehicles, fuel logs, the typed
client, …) are merging with **no** automated lint/typecheck/test/build gate — only
`api-schema.yml` and `tickets.yml` run. Critically, the privacy invariant
"cross-user → 404, not 403" is tested only in `*.integration.test.ts` blocks gated
on `describe.skipIf(!process.env.DATABASE_URL)`, so without a Postgres in CI it
**never executes**. The `test` job must provide a database so those tests run.

We follow the create-t3-turbo CI shape: a reusable composite setup action under
`tooling/github/setup`, then parallel jobs.

## Acceptance criteria

- [x] `tooling/github/setup/action.yml` is a composite action that checks out,
      installs pnpm + Node (from `.nvmrc`), and runs `pnpm install`.
- [x] `.github/workflows/ci.yml` runs on `pull_request` and `push` to `main`,
      with `concurrency` cancelling superseded runs on non-main refs.
- [x] Jobs (parallel where possible): `lint` (incl. `pnpm lint:ws` and
      `pnpm lint:tickets`), `format` (`pnpm format:check`), `typecheck`, `test`,
      `build`.
- [x] The `test` job runs a **Postgres service** (or container) and sets
      `DATABASE_URL` so the `*.integration.test.ts` suites actually execute — the
      cross-user 404 ownership tests must run in CI, not be silently skipped. Run
      `pnpm db:migrate` against it before the suite.
- [x] Turborepo remote caching is wired via repo secrets/vars but degrades
      gracefully when they're absent (forks).
- [x] The workflow copies `.env.example` to `.env` so commands needing env vars
      don't fail.
- [ ] CI passes green on a branch that contains only the bootstrap +
      `tooling/*`.
- [x] `docs/getting-started.md` mentions that CI mirrors the local validation
      commands.

## Notes

- CI jobs must check out the repository before invoking the local composite
  action; the composite also performs the required checkout as part of its
  reusable setup contract.
- Database-backed validation on 2026-06-21 ran all vehicle ownership integration
  tests successfully, but the pre-existing Better Auth integration test failed
  because `auth_user.id` was inserted as `DEFAULT` despite having no database
  default. The CI-green acceptance criterion remains unchecked pending that
  unrelated auth fix.

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
