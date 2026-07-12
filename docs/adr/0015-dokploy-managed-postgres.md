# ADR-0015 — Dokploy-managed PostgreSQL and Dokploy-managed backups

**Date:** 2026-07-12
**Status:** Accepted
**Supersedes:** The implementation from T-047 (backup sidecar + `scripts/backup.sh` / `scripts/restore.sh`). T-047 is `done` and stays `done`; this ADR records that CarNotea no longer owns the backup mechanism.

---

## Context

T-045 placed PostgreSQL inside `docker-compose.prod.yml` as a named-volume
service. T-047 added a `backup` sidecar service + `scripts/backup.sh` /
`scripts/restore.sh` that ran `pg_dump`, uploaded dumps to an S3-compatible
bucket via AWS CLI, and pruned old objects, all driven by host cron.

This approach has one fundamental drawback: **the Postgres volume and the app
stack are the same deploy unit**. A `docker compose down` or a Dokploy redeploy
that recreates the stack touches the database container. Credentials for both
Postgres itself (password) and the backup bucket (R2 keys) must live in Dokploy's
Environment Variables for the app — growing the secret surface. Dokploy already
offers a first-party **Database service type** (Create Service → Database →
PostgreSQL 16) that:

- runs the database as an independent lifecycle unit not tied to the app stack;
- provides an **Internal Connection URL** consumed as `DATABASE_URL` by the app;
- has built-in backup scheduling to Cloudflare R2 configured entirely from the
  Dokploy UI;
- keeps R2 credentials inside Dokploy's own secret store, not in this repo's env
  vars;
- survives a full app redeploy (including `down`) without database downtime.

## Decision

1. **PostgreSQL 16 is created as a Dokploy Database service**, not as a service
   in `docker-compose.prod.yml`.
2. **The application connects exclusively through `DATABASE_URL`**, which is set
   in Dokploy's Environment Variables UI to the Internal Connection URL of the
   Dokploy Database service. No hostname, port, user, or password is hardcoded
   anywhere in this repository.
3. **Backups and restore are configured from Dokploy's UI**, targeting Cloudflare
   R2. CarNotea's repository does not own, schedule, or implement backup logic.
4. **`scripts/backup.sh` and `scripts/restore.sh` are deleted** — the repository
   does not contain a second, parallel backup mechanism.
5. **`docker-compose.prod.yml` retains** `migrate`, `api`, and `web` only,
   preserving the migration-before-API ordering guarantee.
6. **`docker-compose.yml` (dev)** is unchanged; local development continues to
   use a local PostgreSQL container with its own volume.

## Consequences

### Good

- **Smaller secret surface.** R2 credentials never appear in this repo's env
  vars. Dokploy's database config is internal to Dokploy.
- **Independent lifecycle.** Postgres restarts and app restarts do not interact.
  A `docker compose down` of the app does not affect the database.
- **Managed backups.** Retention policy, encryption, and R2 bucket configuration
  are managed from the Dokploy UI, not from shell scripts in this repo.
- **Simpler compose file.** No postgres service, no backup service, no volume
  declaration, no AWS env vars in the prod stack.
- **No code changes needed** when switching DB credentials — only Dokploy's
  Environment Variables UI needs updating.

### Neutral

- `migrate` no longer has a `depends_on: postgres: service_healthy` check —
  Postgres is external. If the external DB is unavailable, `drizzle-kit migrate`
  will fail with a connection error (non-zero exit), which is the correct
  failure signal: Dokploy will stop the deploy and leave the existing containers
  running.
- The one-shot cutover requires manual data migration (copy data from old volume
  to new Dokploy DB) before the PR is merged. See `docs/deployment.md` §
  Cutover runbook.

### Bad / risks

- None identified. Dokploy's Database service is the recommended approach for
  the platform we are already using.

## Alternatives considered

- **Keep Postgres in compose, add Dokploy UI-based backup on top.** Rejected:
  two parallel mechanisms (compose sidecar and Dokploy UI) for the same data;
  credentials still proliferate; compose lifecycle still couples DB to app.
- **Use an external managed DB (e.g. Neon, Supabase).** Rejected for now: adds
  an external service dependency and cost. Dokploy's own Database service is
  already available on the existing self-hosted instance at no extra cost.
- **WAL archiving / PITR.** Out of scope — scheduled dumps are sufficient for
  the current stage. PITR remains a possible follow-up if RPO requirements
  tighten.
