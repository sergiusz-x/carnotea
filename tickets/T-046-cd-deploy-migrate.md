---
id: T-046
title: Continuous deployment with safe release-step migrations
status: in_progress
priority: high
owner: codex
dependencies: [T-045, T-015]
labels: [ops, ci]
created_at: 2026-06-15
updated_at: 2026-07-08
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

**Trigger-mechanism update (2026-07-08):** the "final design" below was
revisited after confirming — by reading Dokploy `v0.29.10`'s own source, not
assuming — that native auto-deploy has **no code path anywhere** that reports
success/failure back to GitHub (no Check Run, Commit Status, or Deployment;
its only GitHub-visible feedback is a PR comment for `application`-type
Preview Deployments, which doesn't apply to `main` or to `compose`-type apps
like CarNotea). It also has a known, unresolved reliability bug where its
webhook is received but the deploy doesn't trigger
([Dokploy/dokploy#3787](https://github.com/Dokploy/dokploy/issues/3787)).
Branch protection alone cannot catch either gap — it guarantees nothing red
_merges_, not that a merge actually _deployed_. The two root causes that sank
the 2026-07-07 attempt are both fixed: the real `composeId`
(`FV0R9T3polDcelIZHPv-h`) is now confirmed against Dokploy's own data, and the
Cloudflare Access policy path was `api/application*` for a `compose`-type app
— it needed `api/compose*` instead (the compose and application API families
are genuinely different endpoints, not a typo in the same one). See the
2026-07-08 Notes entry.

The final design: Dokploy's `Autodeploy` toggle is **off**; GitHub Actions is
now the deploy trigger. `.github/workflows/ci.yml`'s `deploy` job (gated on
`lint`, `format`, `typecheck`, `test`, `build`, `audit` passing, only on push
to `main`) calls the reusable `.github/workflows/deploy-dokploy.yml`, which
calls Dokploy's `compose.deploy` API (a direct, synchronous call — not the
flaky webhook path, so unaffected by #3787), polls `compose.one`'s
`composeStatus`, and records the result as a GitHub Deployment
(`environment: production`), giving a "View deployment" link and an
Environments-tab history exactly like Vercel/Netlify. Branch protection stays
as the pre-merge gate.

## Acceptance criteria

- [x] Nothing that fails CI (`lint`, `format`, `typecheck`, `test`, `build`,
      `audit`) can reach `main` — enforced by a GitHub branch protection rule
      requiring those status checks before merge (not by a script).
- [x] Dokploy deploys on every push to `main` — via GitHub Actions calling
      Dokploy's `compose.deploy` API (native `Autodeploy` toggle off, to avoid
      a double trigger).
- [ ] A GitHub Deployment (`environment: production`) is created for each
      deploy and marked `success`/`failure` to match the real outcome,
      visible as a "View deployment" link on the commit/PR and in the repo's
      Environments tab — verified live, not just by inspecting the workflow.
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
- [x] `docs/deployment.md` documents the pipeline and how to reuse it
      (GitHub Actions → Dokploy `compose.deploy` → poll → GitHub Deployment
      status, plus branch protection) for a future app.

## Files to touch

- `.github/workflows/ci.yml` (`deploy` job, gated on the other CI jobs)
- `.github/workflows/deploy-dokploy.yml` (reusable, calls Dokploy's API)
- `docs/deployment.md`

## Out of scope

- Creating the prod compose stack itself (T-045).
- Secrets storage/rotation strategy (T-048) — production app secrets still
  need none of this; only the new GitHub Actions deploy-trigger secrets
  (`DOKPLOY_API_KEY`, `CF_ACCESS_CLIENT_ID/SECRET`) are new, documented in
  `docs/deployment.md` § 8.
- Backups before migrate (T-047) — reference it, but the schedule lives there.
- Blue/green or zero-downtime orchestration beyond Dokploy's own rollout.
- Auto-generating migrations — those are authored via `pnpm db:generate`
  (ADR-0002) and reviewed in their own PRs.

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
- 2026-07-07 (attempt 2): Reverted the custom workflow entirely. Switched to
  Dokploy's native GitHub App auto-deploy plus a GitHub branch protection
  rule on `main` as the test gate. No Dokploy API key, no Cloudflare Service
  Token, no Access policy change — fewer credentials than either prior model.
- 2026-07-08 (attempt 3, current): Confirmed directly in Dokploy `v0.29.10`
  source that native auto-deploy has no GitHub status-reporting path at all
  (searched for `checks.create`/`statuses.create`/`createCommitStatus`
  repo-wide — zero matches; the only GitHub feedback is a PR comment for
  `application`-type Preview Deployments, not applicable here), and that its
  webhook has an open reliability bug (Dokploy/dokploy#3787) with no way for
  this pipeline to detect a silently-dropped deploy. Re-attempted the API
  approach with both 2026-07-07 root causes fixed: confirmed real
  `composeId` (`FV0R9T3polDcelIZHPv-h`, found via Dokploy's own Postgres
  `compose` table) and the correct endpoint family (`compose.deploy`/
  `compose.one`, not `application.*` — CarNotea is a compose app; the prior
  Access policy path `api/application*` was matching a real but wrong
  endpoint, not failing to match at all). `compose.deploy`
  (`apps/dokploy/server/api/routers/compose.ts:411`) enqueues a deployment job
  directly and is a separate code path from the webhook handler, so it isn't
  subject to #3787. Recreated `deploy-dokploy.yml` from git history
  (`c25c6d2^`) with `application.*` → `compose.*` and `applicationStatus` →
  `composeStatus` swapped throughout; the GitHub Deployments API steps were
  reused unchanged since they never actually failed in the 2026-07-07 attempt.
  Per T-085's lesson, this does **not** have GitHub Actions SSH into the VPS
  and run `docker compose` itself — Dokploy remains the sole deploy executor;
  GitHub Actions only triggers it and reports the result.
