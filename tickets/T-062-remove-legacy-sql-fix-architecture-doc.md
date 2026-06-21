---
id: T-062
title: Remove legacy sql/ + tests/ and fix the stale architecture data-flow
status: done
priority: medium
size: S
spec_version: 1
owner: claude-opus-4-8
dependencies: [T-002]
labels: [docs, cleanup, db]
created_at: 2026-06-21
updated_at: 2026-06-21
closed_at: 2026-06-21
---

# T-062 — Remove legacy SQL + reconcile the architecture doc

## Goal

Delete the superseded `sql/` and `tests/` legacy SQL (the abandoned
trigger/procedure design) and fix `docs/architecture.md`, which still described
that design as if it were live.

## Context

T-002 moved the schema to Drizzle schema-as-code; ADR-0002 explicitly says the root
`sql/` directory is "preserved as a git reference while T-002 is being worked …
[then] can be deleted", and T-002's own notes list deleting `sql/`/`tests/` as an
optional follow-up. That follow-up was never done, so the legacy files lingered and
were the source of stale, self-contradictory data-flow examples in
`architecture.md` (which described `add_fuel_log` / `resolve_issue_with_service`
procedures and `trg_fuel_logs_sync_mileage_reading` sync triggers that exist only in
`sql/`, not in `packages/db/migrations/`). Sync actually lives in NestJS services.

## Contract

### Delivered artifacts

- Deleted `sql/00..07_*.sql` and `tests/integrity_audit.sql` (git history retains
  them; no TS or compose reference them).
- `docs/architecture.md` — data-flow section rewritten to describe app-level
  `MileageSyncService`/`CostSyncService` sync (no nonexistent triggers/procedures,
  no false atomicity claim), with a pointer to T-061.
- `AGENTS.md` repo map — dropped the `sql/` and `tests/` rows.
- `packages/shared/AGENTS.md` — seed reference repointed from `sql/07_seed_data.sql`
  to `packages/db/migrations/0003_seed_lookups.sql`.

### Provides / Consumes

- _n/a_ (cleanup + docs).

## Acceptance criteria

- [ ] `sql/` and `tests/integrity_audit.sql` are removed; nothing in the build,
      `docker-compose.yml`, or TS references them.
- [ ] `docs/architecture.md` data-flow matches the implemented app-level sync; no
      reference to `add_fuel_log` / `resolve_issue_with_service` / sync triggers.
- [ ] Repo map and `packages/shared/AGENTS.md` no longer point at deleted files.
- [ ] `pnpm lint:tickets` and `pnpm format:check` pass.

## Test matrix

| Case                | Expected                                                                              |
| ------------------- | ------------------------------------------------------------------------------------- |
| no dangling refs    | legacy SQL names appear only in done-ticket / ADR history, not in live schema or docs |
| compose still works | `docker-compose.yml` does not mount `sql/` (it doesn't)                               |
| docs consistent     | architecture.md §boundaries and §data-flow agree (app-level sync)                     |

## Files to touch

- delete: `sql/**`, `tests/integrity_audit.sql`
- `docs/architecture.md`, `AGENTS.md`, `packages/shared/AGENTS.md`

## Out of scope

- The atomicity fix of the sync seam itself — that is T-061.
- Editing the done tickets (T-002/T-003) or ADR-0002 that mention `sql/` as
  historical context — they stay as the record.

## Implementation notes

- ADR-0002 already sanctioned the deletion, so no new ADR is needed; git history is
  the "reference" it referred to.

## Verification

- `git rm` the legacy files; `rg -n "trg_fuel_logs_sync|add_fuel_log|resolve_issue_with_service"`
  → matches only in done-ticket history / ADR context, not in live schema or docs.
- `pnpm format:check` and `pnpm lint:tickets` → pass.

## References

- ADR: [ADR-0002](../docs/adr/0002-drizzle-schema-as-code.md) (sanctions deletion),
  [ADR-0012] context for the index work in the same sweep
- Related tickets: T-002 (schema-as-code), T-061 (atomic seam)
