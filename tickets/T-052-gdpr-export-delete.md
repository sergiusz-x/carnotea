---
id: T-052
title: GDPR data export and account deletion
status: ready
priority: high
owner: ~
dependencies: [T-029, T-020, T-026]
labels: [compliance, account]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-052 — GDPR data export and account deletion

## Goal

Let an authenticated user export **all** their personal data as a single
machine-readable file and permanently delete their account together with every
record they own, satisfying GDPR data-portability (Art. 20) and erasure
(Art. 17) for our EU users.

## Context

CarNotea targets EU users, so portability and "right to be forgotten" are legal
obligations, not nice-to-haves. By now the domain owns vehicles (T-020),
expenses (T-026), reminders (T-027), the user profile (T-029), and the
logs/services/issues hung off a vehicle. Auth identity lives in better-auth's
own tables (user/account/session/verification) per ADR-0004, linked to the
domain `users` row by id — so a correct erasure must cascade across **both** the
domain schema and the better-auth tables, or stale auth rows remain.

## Acceptance criteria

- [ ] `GET /me/export` (authenticated) returns a single file containing the
      caller's **vehicles, logs, services, issues, expenses, reminders, and
      profile** — everything they own, nothing belonging to another user.
- [ ] The export is machine-readable (JSON, `Content-Disposition: attachment`)
      with a stable, documented top-level shape validated by a **Zod** schema.
- [ ] The export excludes secrets (password hashes, session tokens) but includes
      the user's own profile fields and account email.
- [ ] `DELETE /me` (authenticated, with an explicit confirmation step)
      permanently deletes the account and **all** owned domain data via cascades.
- [ ] Deletion also removes the linked **better-auth** rows (user, accounts,
      sessions, verifications) so no orphaned auth identity survives.
- [ ] After deletion the session is invalidated and the credentials no longer
      authenticate; a re-check confirms zero rows remain for that user id.
- [ ] FK `ON DELETE CASCADE` (or an equivalent transactional delete) is verified
      across vehicles → logs/services/issues/expenses/reminders so deletion is
      atomic and leaves no orphans.
- [ ] User-facing copy for the export/delete UI and the confirmation dialog
      exists in **both** `pl` and `en`.

## Files to touch

- `apps/api/src/account/` (new) — export + delete handlers
- `apps/api/src/account/account.schema.ts` — Zod export envelope
- `packages/db/src/schema/*` — verify/adjust cascade FKs (+ `pnpm db:generate`)
- `apps/web/src/routes/settings/` — export + delete UI
- `apps/web/src/i18n/locales/{pl,en}/*`
- `docs/architecture.md` (data-rights flow)

## Out of scope

- Async/large-export job queue or emailed download links — synchronous response
  is fine at current data volumes.
- Soft-delete / grace-period / undo — deletion is immediate and permanent.
- Admin-initiated deletion or data-subject-request tooling for operators.
- Export formats beyond JSON (no CSV/PDF).

## Implementation notes

- Prefer DB-level `ON DELETE CASCADE` on the ownership FKs so a single delete of
  the user row is atomic; if better-auth tables can't carry the cascade to the
  domain side, wrap both deletes in one transaction.
- Reuse the existing per-resource Zod schemas to compose the export envelope —
  don't hand-write a parallel type (root AGENTS.md).
- Scope **every** query by the authenticated user id; never trust a path/body id
  for ownership.
- Confirmation: require the user to re-confirm (e.g. type their email) before
  `DELETE /me` proceeds; surface an irreversibility warning in the UI.

## References

- ADR: [ADR-0004](../docs/adr/0004-better-auth.md) (auth tables linked by id)
- Related tickets: T-029 (profile), T-020 (vehicles), T-026 (expenses),
  T-027 (reminders)
- External: GDPR Art. 17 (erasure), Art. 20 (portability)
