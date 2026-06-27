---
id: T-047
title: Automated Postgres backups + tested restore runbook
status: in_progress
priority: medium
owner: codex
dependencies: [T-045]
labels: [ops, data]
created_at: 2026-06-15
updated_at: 2026-06-27
closed_at: ~
---

# T-047 — Automated Postgres backups + tested restore runbook

## Goal

Schedule automated, retained, off-box Postgres backups for the production stack
and document a restore procedure that has actually been exercised end-to-end.

## Context

T-045 runs Postgres in the prod compose stack on a single VPS with one named
volume — a single point of failure. The vehicle diary is user data we cannot
regenerate, so before real users arrive we need backups that survive the box
dying and a restore path we have proven works (an untested backup is not a
backup). This rides on the prod stack but stays independent of CD (T-046).

## Acceptance criteria

- [x] A scheduled job runs `pg_dump` (custom/`-Fc` format) of the production
      database on a defined cadence (e.g. daily), driven from the prod compose
      stack (a sidecar service or host cron invoking the postgres container).
- [x] Backups are copied **off the box** to remote storage (e.g. S3-compatible
      bucket / object store) — a local-only copy does not satisfy the criterion.
- [x] A retention policy prunes old backups (e.g. N daily + M weekly) so storage
      doesn't grow unbounded; the policy is documented.
- [x] Backups are restorable: a documented `pg_restore` runbook exists in
      `docs/deployment.md` (or `docs/runbooks/`) and has been **executed against
      a throwaway database**, with the verification noted in the PR.
- [x] Backup credentials and the remote-storage endpoint come from env/secrets,
      never committed; `.env.example` documents the variable names only.
- [x] A backup failure is observable (non-zero exit / log line) rather than
      silently skipped.

## Files to touch

- `docker-compose.prod.yml` (backup sidecar service or profile)
- `scripts/backup.sh`, `scripts/restore.sh` (new)
- `docs/deployment.md` or `docs/runbooks/restore.md` (new)
- `.env.example` (backup/storage var names, commented)

## Out of scope

- Point-in-time recovery / WAL archiving — plain scheduled dumps for now;
  PITR is a follow-up if RPO demands it.
- Cross-region replication or hot standby.
- Automated restore drills in CI — restore is documented and manually verified
  here; automating the drill is a later ticket.
- Backing up anything other than Postgres (uploaded media, if any, is separate).

## Implementation notes

- Prefer `pg_dump -Fc` (custom format) for compression + selective
  `pg_restore`; run it from inside/against the postgres container so the client
  version matches the server.
- A small alpine sidecar with cron (or the host's cron calling
  `docker compose exec`) keeps the moving parts minimal — avoid pulling in a
  heavyweight backup framework.
- For off-box upload use the storage provider's CLI (e.g. `aws s3 cp` /
  `rclone`); keep credentials in env injected at runtime (aligns with T-048).
- The restore runbook must be copy-pasteable: stop app, restore into a fresh
  DB, verify row counts / a known record, then cut over.

## References

- Related tickets: T-045 (prod compose + postgres), T-046 (CD — back up before
  migrate), T-048 (secrets for storage credentials)
- External: pg_dump / pg_restore —
  <https://www.postgresql.org/docs/16/app-pgdump.html>

## Notes

- 2026-06-27: The production backup path uses a one-shot `backup` service in
  `docker-compose.prod.yml`, scheduled by host cron with
  `docker compose --profile ops run --rm backup`. This keeps the cadence outside
  the app containers while still driving the work from the prod compose stack.
- 2026-06-27: Off-box storage targets an S3-compatible bucket via AWS CLI env
  credentials. The script rejects non-HTTPS endpoints and defaults object
  encryption to `BACKUP_S3_SSE=AES256`; KMS is supported through
  `BACKUP_S3_SSE=aws:kms`.
- 2026-06-27: Restore drill executed locally against throwaway databases
  `t047_source` and `t047_restore`. A custom-format dump restored successfully,
  and `select note from restore_probe where id = 1;` returned `backup-works`.
