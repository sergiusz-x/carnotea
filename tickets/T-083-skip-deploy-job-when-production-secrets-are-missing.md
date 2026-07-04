---
id: T-083
title: Skip deploy job when production secrets are missing
status: done
priority: high
size: S
spec_version: 1
owner: codex
dependencies: []
labels: [ci, deploy, github-actions]
created_at: 2026-07-04
updated_at: 2026-07-04
closed_at: 2026-07-04
---

# T-083 — Skip deploy job when production secrets are missing

## Goal

Keep `main` green when the repository is not configured with the required production deploy secrets.

## Context

After the API and web image builds were fixed, the `Deploy` workflow still failed on `main` because the deploy job always ran even when all production secrets were empty. The failing command was `ssh "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}"`, which became `ssh "@"` and exited with code 255.

## Contract

Gate the `deploy` job so it only runs when all required production deploy secrets are configured.

### Endpoints / routes

_n/a_

### Request / response shapes

_n/a_

### Provides

- `Deploy` workflow succeeds when image builds succeed but production secrets are intentionally absent.

### Consumes

- Existing GitHub Actions `secrets.*` expressions.

## Acceptance criteria

- [x] `deploy` job is skipped when required production secrets are empty.
- [x] `build-and-push` job still runs and publishes images.
- [x] Relevant local validation commands pass.
- [x] GitHub `Deploy` workflow on `main` no longer fails because of empty secrets.

## Test matrix

| Case                      | Input                                            | Expected                                       |
| ------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| Missing deploy secrets    | push to `main` with empty production secrets     | `build-and-push` runs, `deploy` job is skipped |
| Configured deploy secrets | push to `main` with all required secrets present | `deploy` job is eligible to run                |

## Files to touch

- `.github/workflows/deploy.yml`
- `tickets/INDEX.md`
- `tickets/T-083-skip-deploy-job-when-production-secrets-are-missing.md`

## Out of scope

- Provisioning production secrets.
- Changing server-side deploy commands.

## Implementation notes

Use a job-level `if` so GitHub records the deploy job as skipped rather than failed when the repository is not configured for production releases.

## Verification

- `pnpm format:check` → passes
- `pnpm lint:tickets` → passes
- GitHub `Deploy` on `main` → `build-and-push` succeeds and `deploy` is skipped when secrets are absent

## References

- Related tickets: T-046, T-080, T-081, T-082
- Failed run: https://github.com/sergiusz-x/carnotea/actions/runs/28701184809
