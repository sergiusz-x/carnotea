---
id: T-046
title: Continuous deployment with safe release-step migrations
status: in_progress
priority: high
owner: codex
dependencies: [T-045, T-015]
labels: [ops, ci]
created_at: 2026-06-15
updated_at: 2026-07-07
closed_at: ~
---

# T-046 — Continuous deployment with safe release-step migrations

## Goal

Make sure only a change that passed CI ever reaches production, that Dokploy
deploys it automatically once it does, and that `drizzle-kit migrate` runs as
an ordered, idempotent release step **before** the app rolls over.

## Context

T-045 produces the prod compose stack and T-015 gives us a green CI pipeline.
The missing piece is a **test-gated** trigger from a merged change to a live
deploy, plus DB migrations applied ahead of the new app version so the new
code never hits an old schema.

**Hosting-model update (2026-07-07):** this ticket originally targeted a
build-and-publish-to-GHCR + SSH deploy model (see the Notes section below for
that history). That model was dropped in T-085 in favor of self-hosted
**Dokploy** (see T-048 and `docs/agents/lessons.md`, 2026-07-04 entries).
Dokploy builds `api`/`web`/`migrate` directly from source via its own
Docker-Compose application type — there is no registry push and no SSH step.

**Trigger-mechanism update (2026-07-07, same day):** a first attempt at the
test gate had GitHub Actions call Dokploy's REST API directly after CI passed
(a custom `deploy-dokploy.yml` workflow, an account-wide Dokploy API key, and
a Cloudflare Access Service Token to get through the dashboard's Access
protection, since the API path sits behind the same Access layer as the
dashboard). It was **reverted** after two live failures in a row — a
Cloudflare Access path-matching mismatch, then an unconfirmed `applicationId`
returning `404` — each requiring reverse-engineering undocumented Dokploy
internals to debug. Neither failure touched the running app (the job never
reached the point of altering containers), but the approach added three new
credentials for a result no better than what Dokploy and GitHub already do
natively. Full history in the Notes section.

The final design: Dokploy's **native GitHub App auto-deploy** (`Autodeploy`
toggle **on**) deploys on every push to `main`, and a **GitHub branch
protection rule** on `main` requires CI (`lint`, `format`, `typecheck`,
`test`, `build`, `audit`) to pass before a PR can be merged at all — so
nothing red ever reaches `main` for Dokploy to deploy. Zero custom API calls,
zero new credentials, both mechanisms already proven (auto-deploy is what
originally got this app live; branch protection is a mature first-party
GitHub feature).

## Acceptance criteria

- [x] Nothing that fails CI (`lint`, `format`, `typecheck`, `test`, `build`,
      `audit`) can reach `main` — enforced by a GitHub branch protection rule
      requiring those status checks before merge (not by a script).
- [x] Dokploy deploys automatically on every push to `main` via its native
      GitHub App auto-deploy (`Autodeploy` toggle on) — no custom trigger,
      no per-app credential.
- [x] `drizzle-kit migrate` runs as a **release step ordered before** the api
      rollout — the existing `migrate` one-shot service (`profiles: [release]`
      in `docker-compose.prod.yml`) applies migrations from
      `packages/db/migrations`, exits non-zero on failure, and Dokploy blocks
      the `api`/`web` rollout when it fails.
- [x] Migrations are idempotent / safe to re-run — `drizzle-kit migrate`
      already tracks applied migrations.
- [x] Rollback notes are documented for the Dokploy model (redeploy a prior
      commit from Dokploy's Deployments tab — no image tag to roll back).
- [x] The deploy is observable: a red PR cannot be merged (visible on the PR
      itself), and Dokploy's own Deployments tab shows the rollout result.
- [x] `docs/deployment.md` documents the pipeline and how to reuse it (native
      auto-deploy + branch protection) for a future app.

## Files to touch

- `.github/workflows/ci.yml` (no `deploy` job — CI status checks are the gate)
- `docs/deployment.md`

## Out of scope

- Creating the prod compose stack itself (T-045).
- Secrets storage/rotation strategy (T-048) — this design needs none.
- Backups before migrate (T-047) — reference it, but the schedule lives there.
- Blue/green or zero-downtime orchestration beyond Dokploy's own rollout.
- Auto-generating migrations — those are authored via `pnpm db:generate`
  (ADR-0002) and reviewed in their own PRs.
- A GitHub Deployments-tab green/red indicator tied to the Dokploy rollout —
  the abandoned API-based design would have provided this; branch protection
  provides an equivalent guarantee (nothing red merges) visible on the PR
  instead.

## Implementation notes

- `drizzle-kit migrate` step is unchanged from the original SSH/GHCR-era
  design — it already lived in `docker-compose.prod.yml`'s `migrate` service
  once T-045/T-085 moved to Dokploy-managed builds.
- Favor expand-then-contract schema changes (add nullable/new, backfill,
  switch, drop later) so the previous running version keeps working during
  the deploy window — this is what makes rollback safe without a DB rollback.
- Branch protection rule: GitHub repo Settings → Branches → add rule for
  `main` → require status checks to pass before merging → select `lint`,
  `format`, `typecheck`, `test`, `build`, `audit`.

## References

- Related tickets: T-045 (prod compose), T-015 (CI), T-047 (backups before
  migrate), T-048 (secrets), T-085 (dropped GHCR/SSH model)
- ADR: [ADR-0002](../docs/adr/0002-drizzle-schema-as-code.md)
- External: drizzle-kit migrate — <https://orm.drizzle.team/docs/migrations>,
  Dokploy auto-deploy — <https://docs.dokploy.com/docs/core/auto-deploy>

## Notes

- 2026-06-26: Production compose now consumes prebuilt GHCR images via
  `IMAGE_REGISTRY` / `IMAGE_TAG`; the VPS no longer builds `api` or `web`
  locally during deploy. **(Superseded 2026-07-05/07 by the Dokploy
  build-from-source model — see T-048 and the 2026-07-07 updates above.)**
- 2026-06-26: The release-step migration container reuses the published API
  image and runs `pnpm --filter @carnotea/db db:deploy`, which delegates to
  `drizzle-kit migrate` against `packages/db/migrations`. This part is
  unchanged under Dokploy — the `migrate` service still runs the same command,
  just built from source instead of pulled from GHCR.
- 2026-07-07 (attempt 1, reverted): Built a Dokploy-API-based GitHub Actions
  workflow (`deploy-dokploy.yml`), gated on CI passing, reporting status via
  GitHub Deployments. Required generating an account-wide Dokploy API key, a
  Cloudflare Access Service Token, and a new Access Application/policy scoping
  that token to `/api/application*`. First live run failed with a `302`
  (Access wasn't matching the API path — Cloudflare path matching is
  segment-based, and `api/application` didn't match `/api/application.deploy`
  until the policy path was changed to `api/application*`). Second live run
  failed with `404` (the `applicationId` used, `carnotea-9ajbgu`, was the
  dashboard's display slug, not confirmed against Dokploy's actual API —
  never verified before merging).
- 2026-07-07 (attempt 2, current): Reverted the custom workflow entirely.
  Switched to Dokploy's native GitHub App auto-deploy (already configured,
  already proven) plus a GitHub branch protection rule on `main` as the test
  gate. No Dokploy API key, no Cloudflare Service Token, no Access policy
  change — fewer credentials than either prior model.
