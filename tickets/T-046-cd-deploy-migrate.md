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

Trigger a Dokploy deployment automatically after a push to `main` passes CI
(lint/format/typecheck/test/build/audit), and run `drizzle-kit migrate` as an
ordered, idempotent release step **before** the app rolls over.

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

Dokploy's own **native GitHub App auto-deploy** (webhook on every push) is
deliberately left **disabled** for this app (`Autodeploy` toggle off in the
Dokploy UI) because it has no way to gate on CI passing or to report status
back to GitHub — see `docs/core/auto-deploy` in Dokploy's docs. Instead, the
trigger is a **reusable GitHub Actions workflow**
(`.github/workflows/deploy-dokploy.yml`) that: waits on the existing CI jobs,
calls Dokploy's REST API (`POST /api/application.deploy`, authenticated with
an account-wide `x-api-key`) to start the deploy, polls
`GET /api/application.one` for `applicationStatus` until `done`/`error`, and
reports the outcome through the GitHub Deployments API so it shows
green/red in the repo's Deployments UI — the actual acceptance-criteria
mechanism below is rewritten for this model; the underlying goal (test-gated,
migration-ordered, observable deploy) is unchanged.

## Acceptance criteria

- [x] A workflow triggers a Dokploy deployment only after `main`'s CI jobs
      (`lint`, `format`, `typecheck`, `test`, `build`, `audit`) all succeed —
      `.github/workflows/ci.yml`'s `deploy` job `needs` all of them and is
      gated to `push` on `main`.
- [x] The trigger uses Dokploy's REST API (`x-api-key`, account-wide, one-time
      generated) rather than a per-application webhook URL/token, so wiring up
      a **new** app only needs its `applicationId` — no new credential.
- [x] `drizzle-kit migrate` runs as a **release step ordered before** the api
      rollout — the existing `migrate` one-shot service (`profiles: [release]`
      in `docker-compose.prod.yml`) applies migrations from
      `packages/db/migrations`, exits non-zero on failure, and Dokploy blocks
      the `api`/`web` rollout when it fails (unchanged from the prior model).
- [x] Migrations are idempotent / safe to re-run — unchanged: `drizzle-kit
migrate` already tracks applied migrations.
- [x] Rollback notes are documented for the Dokploy model (redeploy a prior
      commit from Dokploy's Deployments tab — no image tag to roll back).
- [x] The deploy is observable: the GitHub Actions `deploy` job polls Dokploy's
      `applicationStatus` and fails the job (visible in Actions + the repo's
      Deployments tab) if the deploy errors or times out.
- [x] `docs/deployment.md` documents the pipeline, the one-time setup
      (Dokploy API key as a GitHub secret), and how to reuse the workflow for
      a future app.

## Files to touch

- `.github/workflows/deploy-dokploy.yml` (new, reusable `workflow_call`)
- `.github/workflows/ci.yml` (add a gated `deploy` job)
- `docs/deployment.md`

## Out of scope

- Creating the prod compose stack itself (T-045).
- Secrets storage/rotation strategy beyond consuming the one Dokploy API key
  as a GitHub secret (T-048).
- Backups before migrate (T-047) — reference it, but the schedule lives there.
- Blue/green or zero-downtime orchestration beyond Dokploy's own rollout.
- Auto-generating migrations — those are authored via `pnpm db:generate`
  (ADR-0002) and reviewed in their own PRs.
- Cross-repo reuse tooling (e.g. a template repo) — the workflow is written to
  be referenceable from another repo via
  `sergiusz-x/carnotea/.github/workflows/deploy-dokploy.yml@main` since this
  repo is public, but building a scaffold/template for future apps is a
  separate concern if it comes up.

## Implementation notes

- `drizzle-kit migrate` step is unchanged from the original SSH/GHCR-era
  design — it already lived in `docker-compose.prod.yml`'s `migrate` service
  once T-045/T-085 moved to Dokploy-managed builds, so this ticket's rewrite
  only touches the _trigger_ half.
- Dokploy's `application.deploy` API is async (returns once the deploy is
  _queued_, not once it's _done_) — the workflow must poll
  `application.one`'s `applicationStatus` (`idle | running | done | error`)
  rather than trusting the initial 200 response as success.
- Favor expand-then-contract schema changes (add nullable/new, backfill,
  switch, drop later) so the previous running version keeps working during
  the deploy window — this is what makes rollback safe without a DB rollback.
- The Dokploy API key is generated once (Dokploy → Settings → Profile →
  API/CLI), scoped to an Organization, and stored as the `DOKPLOY_API_KEY`
  GitHub repository secret — it is **not** per-application, unlike the
  webhook-URL method Dokploy also offers for non-GitHub-App sources.

## References

- Related tickets: T-045 (prod compose), T-015 (CI), T-047 (backups before
  migrate), T-048 (secrets), T-085 (dropped GHCR/SSH model)
- ADR: [ADR-0002](../docs/adr/0002-drizzle-schema-as-code.md)
- External: drizzle-kit migrate — <https://orm.drizzle.team/docs/migrations>,
  Dokploy API — <https://docs.dokploy.com/docs/api>

## Notes

- 2026-06-26: Production compose now consumes prebuilt GHCR images via
  `IMAGE_REGISTRY` / `IMAGE_TAG`; the VPS no longer builds `api` or `web`
  locally during deploy. **(Superseded 2026-07-05/07 by the Dokploy
  build-from-source model — see T-048 and the 2026-07-07 update above.)**
- 2026-06-26: The release-step migration container reuses the published API
  image and runs `pnpm --filter @carnotea/db db:deploy`, which delegates to
  `drizzle-kit migrate` against `packages/db/migrations`. This part is
  unchanged under Dokploy — the `migrate` service still runs the same command,
  just built from source instead of pulled from GHCR.
- 2026-07-07: Rewrote the CD trigger from GHCR/SSH to a Dokploy-API-based
  GitHub Actions workflow, gated on CI passing, reporting status via GitHub
  Deployments — see acceptance criteria above.
