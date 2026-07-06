---
id: T-078
title: Web profile language preference save regression
status: done
priority: medium
size: S
spec_version: 1
owner: ~
dependencies: [T-041]
labels: [web, bug]
created_at: 2026-07-01
updated_at: 2026-07-01
closed_at: 2026-07-01
---

# T-078 - Web profile language preference save regression

## Goal

Make the `/profile` language preference persist through the profile API and restore
the saved language when the profile is loaded again.

## Context

A user reported that saving their language on `/profile` does not stick. T-041
already owns the profile settings screen contract, including live language
switching and restoring the saved locale.

## Contract

### Endpoints / routes

| Route      | Data                  | Mutation             |
| ---------- | --------------------- | -------------------- |
| `/profile` | `profileQueryOptions` | `PATCH /api/me` body |

### Request / response shapes

- `UserProfileUpdateSchema` from `@carnotea/shared`, using `localePref`.

### Provides

_n/a_

### Consumes

- `profileQueryOptions` and `useUpdateProfile` from `apps/web/src/features/profile/queries.ts`.
- i18next language persistence via `i18n.changeLanguage(...)`.

## Acceptance criteria

- [x] Loading `/profile` with `localePref: "pl"` switches the UI to Polish and persists `carnotea.lang=pl`.
- [x] Saving preferences sends `localePref` to `PATCH /api/me` and switches the UI language after success.
- [x] Regression tests cover profile locale restore and profile preference save.

## Test matrix

| Case                 | Input                   | Expected                                |
| -------------------- | ----------------------- | --------------------------------------- |
| restore saved locale | profile `localePref=pl` | i18n language and localStorage are `pl` |
| save locale          | choose `pl`, submit     | PATCH body includes `localePref: "pl"`  |

## Files to touch

- `apps/web/src/features/profile/components/profile-screen.tsx`
- `apps/web/src/features/profile/components/profile-screen.test.tsx`

## Out of scope

- Changing the profile API contract.
- Persisting the header language switcher to the profile API.

## Implementation notes

- Keep the fix local to the profile screen unless broader app bootstrapping proves necessary.

## Verification

- `pnpm --filter @carnotea/web test profile-screen` -> all pass
- `pnpm --filter @carnotea/web typecheck` -> 0 errors

## References

- Related ticket: T-041
- ADR: [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
