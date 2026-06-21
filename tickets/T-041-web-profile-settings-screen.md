---
id: T-041
title: Web profile and settings screen (locale, units, currency, account)
status: ready
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-032, T-029]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-041 — Web profile and settings screen (locale, units, currency, account)

## Goal

Build the profile/settings screen where a user views and edits their account details
and preferences — locale, units, default currency — and reaches the account/data
actions, driven by TanStack Query against the typed client.

## Context

Users need one place to control how the app presents data (language, units, currency)
and to manage their account. This screen sits behind the auth guard (T-032) and
reads/writes the profile API (T-029). GDPR export/delete is a separate ticket (T-052);
this screen only links to those actions.

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

## Contract

### Routes

| Route      | Screen          | Data                  |
| ---------- | --------------- | --------------------- |
| `/profile` | account + prefs | `profileQueryOptions` |

Under the `_authenticated` layout (T-032).

### Query keys

```
['me']     # the user profile (same source as the header/session profile)
```

### Request / response shapes

- `UserProfileSchema`, `UserProfileUpdateSchema` from `@carnotea/shared` (T-029).
  Editable: `firstName`, `lastName`, and preferences `locale` (`pl|en`), `units`
  (`metric|imperial`), `currency` (ISO-4217). `email` is read-only.

### Provides

- _n/a_

### Consumes

- `apiClient.GET/PATCH` (T-033 seam + T-011), profile API (T-029), app shell (T-032),
  i18n (T-010) for live locale switching.

## Acceptance criteria

- [ ] `/profile` (behind the guard) reads the profile via TanStack Query with loading
      and error states.
- [ ] Account section shows firstName, lastName, email; editable fields use the T-031
      form stack with the shared profile schema; server validation errors surface on
      fields. `email` is read-only.
- [ ] Preferences section sets locale (pl/en), units, and default currency; changing
      locale switches the UI language live via i18next.
- [ ] Saving preferences persists through the profile API and the chosen locale is
      restored on next load.
- [ ] Account section links to GDPR data export and account deletion (T-052) —
      links/placeholders only, not the flows.
- [ ] All reads/writes via TanStack Query + typed client; mutations invalidate `['me']`.
- [ ] Every string in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (view, edit account, switch locale live, set
      currency/units); fallback noted.

## Test matrix

Inherits the screens baseline, plus:

| Case                   | Expected                                         |
| ---------------------- | ------------------------------------------------ |
| email read-only        | email field is not editable                      |
| locale switches live   | changing locale updates UI text immediately      |
| locale persists        | reload restores the chosen locale                |
| invalid currency error | server 400 surfaces on the currency field        |
| GDPR links present     | export/delete links/placeholders shown (no flow) |

## Files to touch

- `apps/web/src/routes/profile.tsx` (or `routes/settings/**`)
- `apps/web/src/features/profile/**`
- `apps/web/src/locales/{pl,en}/profile.json`

## Out of scope

- GDPR data export and account deletion flows — T-052 owns those; link only.
- Authentication/session management (T-032 owns guard + session).
- Per-vehicle currency overrides — vehicles carry their own `currencyCode` (T-033);
  this sets the user-level default.

## Implementation notes

- Wire the locale control to i18next so changing it updates the UI immediately and
  persists (profile API + i18next language detector) without a reload.
- Keep units/currency as user-level defaults new vehicles inherit; do not retroactively
  rewrite existing vehicles' `currencyCode`.
- Follow the T-032 app-shell layout so the screen reuses the authenticated chrome.

## Verification

- `pnpm --filter @carnotea/web test profile` → all pass
- `pnpm --filter @carnotea/web dev` → agent-browser exercises view/edit/locale-switch
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-032 (app shell), T-029 (API profile), T-031 (forms), T-011,
  T-052 (GDPR)
- ADR: i18n pl/en — [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
