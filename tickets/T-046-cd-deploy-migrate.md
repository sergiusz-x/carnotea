---
id: T-046
title: Continuous deployment with safe release-step migrations
status: in_progress
priority: high
owner: codex
dependencies: [T-045, T-015]
labels: [ops, ci]
created_at: 2026-06-15
updated_at: 2026-06-26
closed_at: ~
---

# T-046 — Continuous deployment with safe release-step migrations

## Goal

Build and publish the api + web images on release, deploy them to the VPS, and
run `drizzle-kit migrate` as an ordered, idempotent release step **before** the
app rolls over.

## Context

T-045 produces deployable images and a prod compose stack, and T-015 gives us a
green CI pipeline. The missing piece is getting a merged/tagged change onto the
server automatically and applying DB migrations safely. Migrations must run
ahead of the new app version so the new code never hits an old schema, and the
process must be safe to re-run.

## Acceptance criteria

- [x] A CD workflow builds the `api` and `web` images on the chosen trigger
      (tag push and/or `main`) and publishes them to a registry (e.g. GHCR) with
      immutable tags (git sha) plus a moving tag (`latest`/release).
- [x] Deploy to the VPS is automated (SSH/`docker compose pull` + `up -d`, or an
      equivalent) using credentials from CI secrets, never committed.
- [x] `drizzle-kit migrate` runs as a **release step ordered before** the api
      rollout — a dedicated one-shot container/job that applies migrations from
      `packages/db/migrations`, exits non-zero on failure, and **blocks** the app
      update when it fails.
- [x] Migrations are idempotent / safe to re-run: re-running the deploy with no
      new migrations is a no-op and never re-applies applied migrations.
- [x] Rollback notes are documented: how to roll the app image back, and the
      expansion/contraction pattern for schema changes so an app rollback does
      not require a DB rollback.
- [x] The deploy is observable: failure is visible in the workflow and does not
      leave the stack half-updated (migrate fails → app not rolled).
- [x] `docs/deployment.md` documents the pipeline, triggers, required secrets,
      and the rollback procedure.

## Files to touch

- `.github/workflows/deploy.yml` (new)
- `docker-compose.prod.yml` (a `migrate` one-shot service / profile)
- `packages/db/` (a `migrate` entrypoint/script if not already present)
- `docs/deployment.md`

## Out of scope

- Creating the images and prod compose stack themselves (T-045).
- Secrets storage/rotation strategy beyond consuming CI secrets (T-048).
- Backups before migrate (T-047) — reference it, but the schedule lives there.
- Blue/green or zero-downtime orchestration beyond compose `up -d` recreate.
- Auto-generating migrations — those are authored via `pnpm db:generate`
  (ADR-0002) and reviewed in their own PRs.

## Implementation notes

- Run migrations as a separate one-shot container that shares `DATABASE_URL`
  with the stack and runs `drizzle-kit migrate`; gate the api `up` on its
  success. `drizzle-kit migrate` already tracks applied migrations, giving the
  idempotency for free — do not hand-roll a runner.
- Favor expand-then-contract schema changes (add nullable/new, backfill, switch,
  drop later) so the previous app image keeps working during the window — this
  is what makes app-level rollback safe without DB rollback.
- Keep deploy credentials (SSH key, registry token) in GitHub Actions secrets;
  T-048 may later move them to a secret store.
- Reuse the T-015 tooling/actions setup for the build half to stay consistent.

## References

- Related tickets: T-045 (images + prod compose), T-015 (CI),
  T-047 (backups before migrate), T-048 (secrets)
- ADR: [ADR-0002](../docs/adr/0002-drizzle-schema-as-code.md)
- External: drizzle-kit migrate — <https://orm.drizzle.team/docs/migrations>

## Notes

- 2026-06-26: Production compose now consumes prebuilt GHCR images via
  `IMAGE_REGISTRY` / `IMAGE_TAG`; the VPS no longer builds `api` or `web`
  locally during deploy.
- 2026-06-26: The release-step migration container reuses the published API
  image and runs `pnpm --filter @carnotea/db db:deploy`, which delegates to
  `drizzle-kit migrate` against `packages/db/migrations`.
