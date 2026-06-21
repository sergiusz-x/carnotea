---
id: T-029
title: User profile endpoints linked to better-auth identity
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-006, T-019]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-029 — User profile endpoints linked to better-auth identity

## Goal

Expose get/update endpoints for the authenticated user's domain profile — name,
email, and presentation preferences (locale, units, currency) — keyed to the
better-auth user id via the `users` table.

## Context

The `users` table is the domain mirror of the auth identity: its `id` is the
better-auth user id, plus `firstName`, `lastName`, `email`. Auth is set up in
T-006 (the `databaseHooks.user.create.after` hook already provisions a `users` row
and `GET /me` already returns it — see `apps/api/src/users/me.controller.ts`), and
shared Zod schemas in T-019. This ticket adds **preferences** + `PATCH /me`.

User-scoped (not vehicle-scoped); reuses the ownership + OpenAPI rules from
[`patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md).

## Contract

### Endpoints

| Method | Path  | Auth    | Success           | Errors                    |
| ------ | ----- | ------- | ----------------- | ------------------------- |
| GET    | `/me` | session | 200 `UserProfile` | 401                       |
| PATCH  | `/me` | session | 200 `UserProfile` | 400 VALIDATION_ERROR, 401 |

`GET /me` already exists; this ticket extends its response with preferences and
adds `PATCH /me`.

### Request / response shapes

- `UserProfileSchema`, `UserProfileUpdateSchema` in `@carnotea/shared`
  (`user-profile.ts`, exists — extend it with preferences). Update accepts
  `firstName`, `lastName`, and preferences only.
- Preferences: `locale ∈ pl | en`, `units ∈ metric | imperial`, `currency` =
  ISO-4217 3-letter code (`currencyCodeField`).
- `email` is **read-only** (owned by better-auth) and not in the update schema.

### Provides

- The user's default `currency`/`units`/`locale`, consumed by web (T-041) and as
  the default `currencyCode` for new vehicles.

### Consumes

- The better-auth session/guard (T-006) for the current user id — never from the
  body.

## Acceptance criteria

- [ ] `GET /me` returns the authenticated user's profile (`id`, `firstName`,
      `lastName`, `email`, preferences); never another user's record.
- [ ] `PATCH /me` updates `firstName`/`lastName` and preferences via `zodRoute()`;
      `updatedAt` stamped.
- [ ] `email` is read-only — attempting to update it is rejected; the response
      email matches the auth identity.
- [ ] Preferences validated against the shared enums; stored in discrete columns
      and returned by `GET /me`.
- [ ] For a logged-in user with no domain `users` row (edge case), a profile is
      provisioned from the auth identity so `GET /me` always succeeds.
- [ ] Email lowercase/format rules mirror the DB checks
      (`users_email_lowercase_chk`, `users_email_format_chk`).

## Test matrix

| Case                        | Input                                | Expected                                |
| --------------------------- | ------------------------------------ | --------------------------------------- |
| get own profile             | authed session                       | 200, own record only                    |
| patch name + prefs          | valid update                         | 200, fields updated, `updatedAt` bumped |
| email read-only             | body includes `email`                | ignored / 400, email unchanged          |
| invalid locale              | `locale: "de"`                       | 400 VALIDATION_ERROR                    |
| invalid currency            | `currency: "EURO"`                   | 400 VALIDATION_ERROR                    |
| missing profile provisioned | session for user with no `users` row | 200, row created                        |
| unauthenticated             | no session                           | 401                                     |

## Files to touch

- `apps/api/src/users/` (controller, service, module)
- `packages/db/src/schema/users.ts` (add preference columns — schema change via
  `db:generate`, see notes)
- `packages/shared/src/schemas/user-profile.ts`
- `apps/api/src/users/*.test.ts` (co-located; **no** `apps/api/test/*.e2e-spec.ts`)

## Out of scope

- Auth flows themselves (sign-up/in/out, password, sessions) — owned by T-006.
- Account deletion / data export — T-052.
- Avatars / file uploads.
- Per-vehicle currency (vehicles carry their own `currencyCode`; this is the user's
  _default_ for new vehicles).

## Implementation notes

- Adding preference columns to `users` is a public-contract DB change — confirm
  scope per **Ask First**, edit `packages/db/src/schema/users.ts`, and run
  `pnpm db:generate` (never hand-edit the migration). Discrete columns
  (`localePref`, `unitsPref`, `currencyPref`) over a JSON blob so they're queryable
  and Zod-validated 1:1.
- Resolve the current user id from the better-auth guard (T-006); never trust an id
  from the body.

## Verification

- `pnpm --filter @carnotea/api test users` → all pass
- `curl -s localhost:3001/openapi.json | jq '.paths."/me"'` → GET + PATCH present

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Schema: `packages/db/src/schema/users.ts`; `packages/shared/src/schemas/user-profile.ts`
- Related tickets: T-006 (better-auth), T-019 (shared schemas), T-041 (web settings),
  T-052 (account deletion)
- ADR: i18n pl/en — [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
