---
id: T-089
title: Fix invalid profile names in /api/me provisioning
status: done
priority: high
size: S
spec_version: 1
owner: codex
dependencies: [T-029, T-041]
labels: [api, web, bug, production]
created_at: 2026-07-09
updated_at: 2026-07-09
closed_at: 2026-07-09
---

# T-089 — Fix invalid profile names in /api/me provisioning

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Make the profile screen load correctly for users whose domain profile row is
missing or contains blank name fields.

## Context

Production reports show `/profile` failing with a Zod validation error for
`lastName` (`too_small`, required) on accounts that have not created any
vehicles yet. Investigation shows two API-side sources of invalid profile data:

1. `GET /api/me` provisions a missing `users` row with empty `firstName` and
   `lastName`.
2. better-auth signup mirrors single-word names into `users.lastName = ''`.

The public `/api/me` contract already requires non-empty `firstName` and
`lastName` via `UserProfileSchema`, so the fix must keep that contract and stop
emitting invalid data.

Follows the existing T-029/T-041 profile contract; no route or schema changes.

## Contract

No public contract changes. `GET /api/me` continues to return
`UserProfileSchema`, but now guarantees non-empty `firstName` and `lastName`
even for legacy rows with blank values and for on-demand provisioning when the
domain row is missing.

### Endpoints / routes

| Method | Path       | Auth    | Success           | Errors  |
| ------ | ---------- | ------- | ----------------- | ------- |
| GET    | `/api/me`  | session | 200 `UserProfile` | 401     |
| PATCH  | `/api/me`  | session | 200 `UserProfile` | 400/401 |
| Web    | `/profile` | guard   | screen loads      | _n/a_   |

### Request / response shapes

- Reuses `UserProfileSchema` and `UserProfileUpdateSchema` from `@carnotea/shared`.
- Adds only API-internal name normalization helpers; no shared schema changes.

### Provides

- API-internal normalization of profile name fields before persistence and
  before serializing `/api/me`.

### Consumes

- Existing `ROUTES.me`, `UserProfileSchema`, and profile screen query parsing.

## Acceptance criteria

- [ ] `GET /api/me` no longer returns blank `firstName`/`lastName` when the
      domain profile row is missing; provisioning creates a contract-valid row.
- [ ] `GET /api/me` returns a contract-valid profile for legacy rows whose
      `firstName` or `lastName` is blank, so `/profile` loads instead of
      showing the Zod issue array.
- [ ] New auth-created domain profiles derived from a single-word signup name
      no longer persist a blank `lastName`.
- [x] Automated tests cover missing-row provisioning and a legacy blank-name
      row.

## Test matrix

| Case                               | Input                               | Expected                                 |
| ---------------------------------- | ----------------------------------- | ---------------------------------------- |
| missing users row                  | authenticated `GET /api/me`         | 200 with non-empty `firstName/lastName`  |
| legacy blank last name             | stored profile with `lastName = ''` | 200 with normalized non-empty `lastName` |
| legacy blank first and last names  | stored profile with both blank      | 200 with normalized non-empty names      |
| single-word auth signup derivation | auth name like `Jan`                | persisted profile has non-empty lastName |

## Files to touch

- `apps/api/src/users/me.controller.ts`
- `apps/api/src/users/me.controller.test.ts`
- `apps/api/src/users/profile-name.ts`
- `apps/api/src/users/profile-name.test.ts`
- `apps/api/src/auth/auth.ts`

## Out of scope

- Any shared schema change in `@carnotea/shared`.
- Any profile UI redesign.
- Any backfill migration over all historical users rows.

## Implementation notes

- Keep the fix API-local to avoid changing the shared profile contract.
- Normalize legacy blanks on read so production users recover immediately.
- Normalize signup/provisioning writes so new bad rows stop being created.
- Implemented on 2026-07-09 by routing both auth signup and /api/me through the
  same deriveProfileNames(...) helper.
- Validation in this worktree used the main checkout's installed dependencies via
  local junctions because a fresh git worktree does not carry its own 
ode_modules.

## Verification

- `pnpm --filter @carnotea/api test -- me.controller profile-name` → all pass
- `pnpm --filter @carnotea/api typecheck` → 0 errors
- `pnpm lint:tickets` → passes

## References

- Related tickets: T-029, T-041
- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Schema: `packages/shared/src/schemas/user-profile.ts`


