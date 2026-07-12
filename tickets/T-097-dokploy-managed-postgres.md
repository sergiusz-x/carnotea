---
id: T-097
title: Move production PostgreSQL management to Dokploy
status: in_progress
priority: high
size: M
spec_version: 1
owner: ~
dependencies: [T-045, T-047, T-048]
labels: [ops, infra, deploy]
created_at: 2026-07-12
updated_at: 2026-07-12
closed_at: ~
---

# T-097 — Move production PostgreSQL management to Dokploy

## Goal

Remove the `postgres` and `backup` services from `docker-compose.prod.yml` so
that production PostgreSQL is created and managed as a Dokploy **Database**
service, with backups and restore handled from Dokploy's UI targeting
Cloudflare R2 — eliminating CarNotea's own backup logic from the repository.

## Context

T-047 implemented an in-compose `backup` sidecar with `scripts/backup.sh` and
`scripts/restore.sh`, scheduled via host cron. That approach worked when
Postgres was inside the compose stack, but Dokploy's native Database service
type provides:

- managed lifecycle (start/stop/restart independent of the app stack),
- Dokploy-UI-driven backup to R2 with a tested restore path,
- internal connection strings that never leave the Dokploy host,
- no R2 credentials stored in this repository or its environment variables.

This ticket supersedes T-047's implementation by handing all of that to
Dokploy. T-047 itself stays `done`; this ticket records the supersession.

## Contract

_n/a_ — no API routes, Zod schemas, or shared types change.

### Endpoints / routes

_n/a_

### Request / response shapes

_n/a_

### Provides

- A `docker-compose.prod.yml` that starts only `migrate`, `api`, and `web`.
- `DATABASE_URL` as the sole connection interface between the app and Postgres.

### Consumes

- Dokploy's internal connection URL for the Postgres 16 Database service
  (injected as `DATABASE_URL` at deploy time — not committed anywhere).

## Acceptance criteria

- [ ] `docker-compose.prod.yml` does not contain a `postgres` service.
- [ ] `docker-compose.prod.yml` does not contain a `backup` service.
- [ ] `docker-compose.prod.yml` does not define `postgres_prod_data` volume.
- [ ] `docker-compose.prod.yml` contains no `POSTGRES_PASSWORD`, `BACKUP_S3_*`,
      `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or `AWS_SESSION_TOKEN`.
- [ ] Production `api` depends only on `migrate` (not on `postgres`).
- [ ] Production `migrate` depends on nothing (no `postgres` service_healthy).
- [ ] `DATABASE_URL: ${DATABASE_URL:?error}` is present for both `migrate` and `api`.
- [ ] `api` starts only after `migrate` completes successfully.
- [ ] `docker-compose.yml` (dev) retains its local `postgres` service unchanged.
- [ ] `scripts/backup.sh` and `scripts/restore.sh` are deleted.
- [ ] `scripts/` directory still exists (contains other scripts).
- [ ] `.env.example` has no `BACKUP_S3_*`, `BACKUP_KEEP_*`, `BACKUP_WEEKLY_DAY`,
      `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`.
- [ ] `.env.example` retains local Postgres vars (`POSTGRES_*`) with a clear
      comment that they are local-dev only.
- [ ] `.env.example` production comment explains `DATABASE_URL` comes from
      Dokploy's Internal Connection URL.
- [ ] `docs/deployment.md` describes the Dokploy-managed Postgres + Dokploy-managed
      backups model.
- [ ] `docs/deployment.md` contains a safe cutover runbook.
- [ ] `docs/deployment.md` has a prominent warning that merging before the
      cutover will cause downtime.
- [ ] No schema changes, no new Drizzle migrations.
- [ ] `pnpm format:check` passes.
- [ ] `pnpm lint` passes.
- [ ] `docker compose -f docker-compose.prod.yml config` (with example vars) does
      not list `postgres` or `backup` services, and has no `postgres_prod_data`.

## Test matrix

| Case                        | Input                                                                                        | Expected                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Compose config validation   | `COMPOSE_PROFILES=release DATABASE_URL=... docker compose -f docker-compose.prod.yml config` | No `postgres` or `backup` service; no `postgres_prod_data` |
| migrate has no postgres dep | Inspect rendered config                                                                      | `migrate.depends_on` is absent or empty                    |
| api depends on migrate only | Inspect rendered config                                                                      | `api.depends_on` lists only `migrate`                      |
| format check                | `pnpm format:check`                                                                          | exit 0                                                     |
| lint                        | `pnpm lint`                                                                                  | exit 0                                                     |

## Files to touch

- `docker-compose.prod.yml`
- `.env.example`
- `scripts/backup.sh` (delete)
- `scripts/restore.sh` (delete)
- `docs/deployment.md`
- `docs/architecture.md`
- `docs/adr/0015-dokploy-managed-postgres.md` (new ADR)
- `tickets/T-097-dokploy-managed-postgres.md` (this file)
- `tickets/INDEX.md` (regenerated)

## Out of scope

- Configuring Dokploy's Database service (manual operator step).
- Migrating data from the old in-compose Postgres volume (manual cutover step).
- Changing the DB schema or generating new Drizzle migrations.
- Adding any new dependencies.

## Implementation notes

- `migrate` previously depended on `postgres` being `service_healthy`. That
  dependency is removed — `migrate` can now start immediately because Postgres
  is external. The `DATABASE_URL` Zod validator in `apps/api/src/config/env.ts`
  already ensures a missing URL is a boot-time crash; no new guard needed.
- The ADR records why we are superseding T-047's approach. The old ticket file
  stays `done` per repo convention; the ADR is the supersession document.
- Secrets management is unchanged: all prod vars go in Dokploy's Environment
  Variables UI, never in a committed file.

## Verification

```bash
# 1. Compose config must not list postgres or backup
COMPOSE_PROFILES=release \
DATABASE_URL='postgresql://example:example@example-db:5432/carnotea' \
BETTER_AUTH_SECRET='example-secret-long-enough-for-validation' \
BETTER_AUTH_URL='https://carnotea.example.com' \
CORS_ORIGINS='https://carnotea.example.com' \
docker compose -f docker-compose.prod.yml config

# 2. Format and lint
pnpm format:check
pnpm lint
```

## References

- Supersedes: T-047 (implementation retired; ticket stays `done`)
- Related: T-045 (prod compose skeleton), T-046 (CD + migrations), T-048 (secrets)
- ADR: [ADR-0015](../docs/adr/0015-dokploy-managed-postgres.md)
