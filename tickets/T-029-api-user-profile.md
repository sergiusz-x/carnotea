---
id: T-029
title: User profile endpoints linked to better-auth identity
status: ready
priority: medium
owner: ~
dependencies: [T-006, T-019]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-029 — User profile endpoints linked to better-auth identity

## Goal

Expose get/update endpoints for the authenticated user's domain profile —
name, email, and presentation preferences (locale, units, currency) — keyed to
the better-auth user id via the `users` table.

## Context

The `users` table is the domain mirror of the auth identity: its `id` is the
better-auth user id, plus `firstName`, `lastName`, `email`. Auth is set up in
T-006 and shared Zod schemas in T-019. Vehicles already reference `users.id`,
but there's no endpoint yet to read or edit the profile, and no home for
user-level preferences (default locale/units/currency) that the web app needs.

## Acceptance criteria

- [ ] `GET /me` returns the authenticated user's profile (`id`, `firstName`,
      `lastName`, `email`, preferences); never another user's record.
- [ ] `PATCH /me` updates `firstName` / `lastName` and preferences, validated by
      a shared Zod schema via `zodRoute()`; `updatedAt` is stamped.
- [ ] `email` is **read-only** here (owned by better-auth) — updating it is
      rejected; the response email matches the auth identity.
- [ ] Preferences are validated against shared enums: `locale` in `pl | en`,
      `units` in `metric | imperial`, `currency` as an ISO-4217 3-letter code;
      stored consistently (column or JSON — see notes) and returned by `GET /me`.
- [ ] On first authenticated request for a user with no domain `users` row, a
      profile row is provisioned from the auth identity (id + email), so `GET
/me` always succeeds for a logged-in user.
- [ ] Zod schemas live in `@carnotea/shared`; types via `z.infer`; the email
      lowercase/format rules mirror the DB checks
      (`users_email_lowercase_chk`, `users_email_format_chk`).

## Files to touch

- `apps/api/src/users/` (controller, service, module)
- `packages/db/src/schema/users.ts` (add preference columns — schema change via
  `db:generate`, see notes)
- `packages/shared/src/schemas/user.ts`
- `apps/api/test/users.e2e-spec.ts`

## Out of scope

- Auth flows themselves (sign-up/in/out, password, sessions) — owned by T-006.
- Account deletion / data export (separate ticket).
- Avatars / file uploads.
- Per-vehicle currency (vehicles already carry their own `currencyCode`; this is
  the user's _default_ for new vehicles).

## Implementation notes

- Adding preference columns to `users` is a public-contract DB change — confirm
  scope per **Ask First**, edit `packages/db/src/schema/users.ts`, and run
  `pnpm db:generate` (never hand-edit the migration). Discrete columns
  (`localePref`, `unitsPref`, `currencyPref`) are preferred over a JSON blob so
  they're queryable and Zod-validated 1:1.
- Resolve the current user id from the better-auth session/guard set up in
  T-006; do not trust an id from the request body.

## References

- Schema: `packages/db/src/schema/users.ts`
- Related tickets: T-006 (better-auth), T-019 (shared Zod schemas/types)
- ADR: i18n pl/en — [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
