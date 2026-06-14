---
id: T-010
title: Web — i18n (pl + en) with i18next
status: ready
priority: medium
owner: ~
dependencies: [T-007]
labels: [web, i18n]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-010 — Web: i18n (pl + en) with i18next

## Goal

Install `i18next` + `react-i18next` in `apps/web`, ship `pl` and `en`
translation files, detect the initial language from the browser, persist the
user's choice, and replace all hard-coded UI strings (currently just the
landing page) with translation keys.

## Context

ADR-0007 commits to bilingual from the first screen. This ticket implements
that commitment so every future feature ticket inherits the convention.

## Acceptance criteria

- [ ] `i18next` + `react-i18next` + `i18next-browser-languagedetector`
      installed in `apps/web`.
- [ ] Translation files live under `apps/web/src/locales/<lang>/<namespace>.json`.
      Initial namespaces: `common`, `landing`. Both `pl` and `en` exist.
- [ ] `useTranslation()` works in any component; the landing page uses it.
- [ ] A simple language switcher in the header lets the user pick `pl` or
      `en`. The choice is persisted in `localStorage`.
- [ ] Date and number formatting in the example route uses
      `Intl.DateTimeFormat` / `Intl.NumberFormat` with the active locale.
- [ ] A lint rule (or a CI check) flags any string literal that looks like
      user-visible text but is not wrapped in `t(...)`. (If lint can't catch it
      cheaply, document the convention in `apps/web/AGENTS.md` and move on.)
- [ ] `apps/web/AGENTS.md` documents the namespace conventions:
      `common` for shared strings, one namespace per feature folder.

## Files to touch

- `apps/web/src/i18n/**`
- `apps/web/src/locales/**`
- `apps/web/src/components/LanguageSwitcher.tsx`
- `apps/web/AGENTS.md`

## Out of scope

- Backend / API error messages translation (separate concern; English-only
  errors for now, web side localises them at presentation time).
- Detecting the language from an authenticated user's profile setting —
  follow-up once T-006 lands.

## Implementation notes

- Keep translation files flat-ish (`feature.section.key`) — don't nest deeper
  than three levels.
- `defaultNS: 'common'`, `fallbackLng: 'en'`, `interpolation: { escapeValue: false }`.
- The "did you forget to translate" check is easiest as an ESLint rule
  combined with a one-line wrapper component for raw text. Pick the cheap
  option.

## References

- ADR: [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
