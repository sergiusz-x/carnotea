---
id: T-006
title: Auth — better-auth integration + user-profile linkage
status: ready
priority: high
owner: ~
dependencies: [T-002, T-004, T-005]
labels: [auth, api, db]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
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

- [ ] New migration `0002_better_auth` adds the better-auth tables in a
      decided location (default: under `vehicle_diary` schema with `auth_`
      prefix; if a separate `auth` schema is preferred, document why).
- [ ] `vehicle_diary.users.id` is reconciled with better-auth's user id: pick
      one of the two strategies and document the decision in
      `packages/db/AGENTS.md`: - (a) `vehicle_diary.users.id` IS the better-auth user id (same UUID), - (b) `vehicle_diary.users.auth_user_id` references better-auth's user
      table.
- [ ] Email/password sign-up creates both an auth record and a
      `vehicle_diary.users` row in one transaction (or via a deterministic
      post-signup hook).
- [ ] The API mounts better-auth's handler under `/api/auth/*`.
- [ ] A guard / middleware exposes `request.user` (typed) to controllers; an
      unauthenticated request to a protected route returns 401.
- [ ] `GET /me` returns the authenticated user's profile.
- [ ] `.env.example` documents `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- [ ] `docs/architecture.md` "Auth" section is updated with the chosen
      linkage strategy.
- [ ] `apps/api/AGENTS.md` documents: "every route under `/api/*` except
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

## References

- ADR: [ADR-0004](../docs/adr/0004-better-auth.md)
- <https://www.better-auth.com>
