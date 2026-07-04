---
id: T-085
title: Remove obsolete VPS deploy workflow
status: done
priority: medium
size: S
spec_version: 1
owner: codex
dependencies: []
labels:
  - ci
  - github-actions
  - cleanup
created_at: 2026-07-04
updated_at: 2026-07-04
closed_at: 2026-07-04
---

# T-085 — Remove obsolete VPS deploy workflow

## Goal

Remove the GitHub Actions deploy workflow that assumes a VPS + Docker Compose production target.

## Context

The current `Deploy` workflow was built around SSH, GHCR image publishing, and `docker compose` on a remote host. The planned hosting direction is closer to a self-hosted Vercel-style platform, so keeping the VPS-specific workflow creates the wrong operational path.

## Contract

Delete `.github/workflows/deploy.yml`, keep the validation workflows intact, and record the hosting-direction correction in agent lessons.

### Endpoints / routes

_n/a_

| Method | Path | Auth | Success | Errors |
| ------ | ---- | ---- | ------- | ------ |

### Request / response shapes

_n/a_

### Provides

- A GitHub Actions setup without the obsolete VPS deployment workflow.

### Consumes

- `.github/workflows/deploy.yml`
- `docs/agents/lessons.md`
- `tickets/INDEX.md`

## Acceptance criteria

- [x] `.github/workflows/deploy.yml` is removed from the repository.
- [x] Ticket index includes T-085.
- [x] Agent lessons record that deploy automation must match the intended hosting model.

## Test matrix

| Case               | Input                                | Expected               |
| ------------------ | ------------------------------------ | ---------------------- |
| workflow inventory | list files under `.github/workflows` | `deploy.yml` is absent |
| ticket lint        | `pnpm lint:tickets`                  | pass                   |
| formatting         | `pnpm format:check`                  | pass                   |

## Files to touch

- `.github/workflows/deploy.yml`
- `docs/agents/lessons.md`
- `tickets/INDEX.md`
- `tickets/T-085-remove-obsolete-vps-deploy-workflow.md`

## Out of scope

- Adding the future hosting/deployment workflow.
- Changing CI, API schema, or ticket validation workflows.

## Implementation notes

- This is a removal only; replacement deploy automation should be introduced later against the chosen platform.

## Verification

- `pnpm format:check` -> pass
- `pnpm lint:tickets` -> pass
- `rg --files .github/workflows` -> `deploy.yml` absent

## References

- Related tickets: T-046, T-083, T-084
