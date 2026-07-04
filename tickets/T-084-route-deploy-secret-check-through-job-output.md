---
id: T-084
title: Route deploy secret check through job output
status: done
priority: high
size: S
spec_version: 1
owner: codex
dependencies: []
labels:
  - ci
  - github-actions
created_at: 2026-07-04
updated_at: 2026-07-04
closed_at: 2026-07-04
---

# T-084 — Route deploy secret check through job output

## Goal

Keep the `Deploy` workflow green on `main` when production deploy secrets are not configured.

## Context

T-083 attempted to skip deploy with a job-level `if:` that read `secrets.*` directly. GitHub Actions rejects that at workflow-evaluation time, so the run fails before any job starts.

## Contract

Move the deploy-configuration check into a dedicated workflow job that reads secrets in step env, writes a boolean job output, and gate the real deploy job on that output.

### Endpoints / routes

_n/a_

| Method | Path | Auth | Success | Errors |
| ------ | ---- | ---- | ------- | ------ |

### Request / response shapes

_n/a_

### Provides

- A valid `Deploy` workflow that skips the `deploy` job when required secrets are absent.

### Consumes

- `.github/workflows/deploy.yml`
- Existing repository secrets for production deployment when they are configured.

## Acceptance criteria

- [x] `Deploy` workflow no longer references `secrets.*` in a job-level `if:` expression.
- [x] Workflow computes deploy readiness in a preceding job and gates `deploy` from its output.
- [x] Ticket index reflects the new repair ticket.
- [x] A repo lesson records that fixing red GitHub `main` requires confirmation on the fresh `main` run, not only on the PR.

## Test matrix

| Case                | Input                                         | Expected                                             |
| ------------------- | --------------------------------------------- | ---------------------------------------------------- |
| secrets missing     | push to `main` with empty deploy secrets      | workflow succeeds with deploy gated off              |
| secrets present     | push to `main` with deploy secrets configured | deploy job remains eligible to run                   |
| workflow validation | GitHub parses `deploy.yml` on push            | run creates jobs instead of failing before execution |

## Files to touch

- `.github/workflows/deploy.yml`
- `docs/agents/lessons.md`
- `tickets/INDEX.md`
- `tickets/T-084-route-deploy-secret-check-through-job-output.md`

## Out of scope

- Changing the production deployment procedure itself.
- Adding or rotating repository secrets.

## Implementation notes

- Use a lightweight `deploy-config` job to compute `configured=true|false` through `$GITHUB_OUTPUT`.
- Keep the deploy steps unchanged once the gate passes.

## Verification

- `pnpm format:check` -> pass
- `pnpm lint:tickets` -> pass
- `pnpm local:ci` -> pass
- GitHub PR checks -> pass
- Fresh `Deploy` run on `main` -> green

## References

- Related tickets: T-080, T-081, T-082, T-083
