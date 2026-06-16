---
id: T-041
title: Web profile and settings screen (locale, units, currency, account)
status: ready
priority: medium
owner: ~
dependencies: [T-032, T-029]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-041 — Web profile and settings screen (locale, units, currency, account)

## Goal

Build the profile/settings screen where a user views and edits their account
details and preferences — locale, units, default currency — and reaches the
account/data-management actions, driven by TanStack Query against the typed
client.

## Context

Users need one place to control how the app presents data (language, units,
currency) and to manage their account. This screen sits behind the auth guard
(T-032) and reads/writes the profile API (T-029). GDPR export/delete is a
separate ticket (T-052); this screen only links to those actions.

## Acceptance criteria

- [ ] A `/profile` (or `/settings`) route behind the auth guard reads the current
      user/profile via TanStack Query with loading and error states.
- [ ] Account section shows firstName, lastName, and email; editable fields use
      the T-031 form stack with the shared Zod profile schema, and server
      validation errors surface on the right fields.
- [ ] Preferences section lets the user set locale (pl/en), units, and default
      currency; changing locale switches the UI language live via i18next.
- [ ] Saving preferences persists through the profile API and the chosen locale
      is restored on next load.
- [ ] Account section links to GDPR data export and account deletion (owned by
      T-052) — links/placeholders only, not the flows themselves.
- [ ] All reads/writes go through TanStack Query + the typed client; mutations
      invalidate the profile query.
- [ ] Every user-facing string exists in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (view, edit account, switch locale live, set
      currency/units). If Chrome is blocked, fall back to documented structural
      verification and note it.

## Files to touch

- `apps/web/src/routes/profile.tsx` (or `routes/settings/**`)
- `apps/web/src/features/profile/**` (account + preferences forms, hooks, queries)
- `apps/web/src/locales/pl/profile.json`, `apps/web/src/locales/en/profile.json`

## Out of scope

- GDPR data export and account deletion flows — T-052 owns those; link only.
- Authentication/session management itself (T-032 owns the guard and session).
- Per-vehicle currency overrides — vehicles carry their own `currencyCode`
  (T-033); this sets the user-level default.

## Implementation notes

- Wire the locale control to i18next so changing it updates the UI immediately and
  persists (profile API + i18next language detector) without a reload.
- Keep units/currency as user-level defaults that new vehicles inherit; do not
  retroactively rewrite existing vehicles' `currencyCode`.
- Follow the T-032 app-shell layout so the screen reuses the authenticated chrome.

## References

- Related tickets: T-032 (app shell/auth), T-029 (API profile), T-031 (forms),
  T-011 (typed client), T-052 (GDPR export/delete)
- ADR: i18n pl/en — `docs/adr/0007-i18n-pl-en.md`
