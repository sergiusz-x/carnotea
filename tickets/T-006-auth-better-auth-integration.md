---
id: T-006
title: Auth — better-auth integration + user-profile linkage
status: done
priority: high
owner: claude
dependencies: [T-002, T-004, T-005]
labels: [auth, api, db]
created_at: 2026-06-13
updated_at: 2026-06-17
closed_at: 2026-06-17
---

# T-006 — Auth: better-auth integration + user-profile linkage

## Goal

Add better-auth to the API: create the required tables via a new migration,
mount the auth handler on the NestJS app, link better-auth's user to the
existing `vehicle_diary.users` profile row, and expose typed helpers that
controllers use to read the authenticated user.

## Context

ADR-0004 picks better-auth. The existing `vehicle_diary.users` table has no
auth fields. This ticket reconciles the two: better-auth owns auth-specific
tables (sessions, accounts, verifications, its own user row); our domain
`users` row stays as the per-user profile and joins to better-auth via id.

This is the trickiest piece of the bootstrap. Keep it tightly scoped: one user
can sign up with email + password, sign in, sign out, and the API can identify
them on subsequent requests.

## Acceptance criteria

- [x] New migration `0004_better_auth` adds the better-auth tables (named per the
      current migration sequence; the ticket's `0002` predates later migrations).
      Tables live in `public` with an `auth_` prefix — the codebase keeps every
      table in `public` (the `vehicle_diary` schema is aspirational); documented
      in `packages/db/AGENTS.md`.
- [x] `users.id` is reconciled with better-auth's user id via strategy (a):
      `users.id` IS the better-auth user id (same UUID). Decision documented in
      `packages/db/AGENTS.md`.
- [x] Email/password sign-up creates both an auth record and a `users` row via a
      deterministic `databaseHooks.user.create.after` hook (idempotent). Covered
      by a DB integration test (skipped where Postgres is unavailable).
- [x] The API mounts better-auth's handler under `/api/auth/*`.
- [x] `AuthGuard` exposes a typed `request.user` to controllers; an
      unauthenticated request to a protected route returns 401.
- [x] `GET /me` returns the authenticated user's profile.
- [x] `.env.example` documents `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- [x] `docs/architecture.md` "Auth" section is updated with the chosen
      linkage strategy.
- [x] `apps/api/AGENTS.md` documents: "every route under `/api/*` except
      `/api/auth/*` requires an authenticated session".

## Files to touch

- `packages/db/migrations/0002_better_auth/**`
- `packages/db/src/schema/auth.ts` (new Drizzle schema file for auth tables)
- `apps/api/src/auth/**`
- `apps/api/src/users/me.controller.ts`
- `apps/api/AGENTS.md`, `packages/db/AGENTS.md`
- `docs/architecture.md`
- `.env.example`

## Out of scope

- OAuth providers (Google, GitHub) — separate ticket once email/password works.
- 2FA, passkeys.
- Password reset flow (it'll be added once email sending is set up).
- Web client integration of auth UI (separate frontend ticket, follows T-011).

## Implementation notes

- better-auth's Drizzle adapter is the natural choice — make sure the table
  names match our convention or override them in the better-auth config.
- The introspection step (T-002) must run after the migration so `schema.ts`
  picks up the new tables.
- The "create profile on signup" behaviour is best implemented as a
  better-auth hook on user creation; keep the logic minimal and idempotent.

## Notes

- **Linkage strategy (a) chosen** over (b): `users.id` equals the better-auth user
  id (UUIDs via `advanced.database.generateId: 'uuid'`). This lets the auth-context
  user id be used directly as the ownership key (`vehicles.user_id`, …) with no
  per-request profile lookup, which is exactly what T-020+ need. No FK between
  `auth_user` and `users`; the link is the shared id value.
- **Auth tables in `public`** with `auth_` prefix, not a `vehicle_diary` schema —
  every existing table is in `public`, so a separate schema would have been an
  inconsistent special case.
- **Name handling:** better-auth signup carries a single `name`; the create hook
  splits it (first token → `first_name`, remainder → `last_name`, empty for a
  single-word name). Richer profile editing is deferred to T-041.
- **Fastify mount:** better-auth's web handler is mounted inside an encapsulated
  Fastify plugin with a raw-string `application/json` parser, so better-auth gets
  the untouched body (and empty-body POSTs don't 400) while the rest of the API
  keeps default JSON parsing.
- **Migration named `0004_better_auth`** (not the ticket's stale `0002`).
- **Verification gap:** the full signup → hook → `/me` path needs a live Postgres;
  that integration test (`auth.integration.test.ts`) is `skipIf` no `DATABASE_URL`
  and was skipped here (no Docker/Postgres in the sandbox). The Fastify mount,
  `AuthGuard` 401, and `/me` happy path are covered by tests that run without a DB.
- **Follow-ups (out of scope):** web auth UI + `trustedOrigins`/CORS config for the
  browser client (after T-011), OAuth providers, password reset (needs email),
  2FA/passkeys.

## References

- ADR: [ADR-0004](../docs/adr/0004-better-auth.md)
- <https://www.better-auth.com>
