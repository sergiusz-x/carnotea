---
id: T-010
title: Web — i18n (pl + en) with i18next
status: in_progress
priority: medium
owner: claude
dependencies: [T-007]
labels: [web, i18n]
created_at: 2026-06-13
updated_at: 2026-06-17
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

- [x] `i18next` + `react-i18next` + `i18next-browser-languagedetector`
      installed in `apps/web`.
- [x] Translation files live under `apps/web/src/locales/<lang>/<namespace>.json`.
      Initial namespaces: `common`, `landing`. Both `pl` and `en` exist.
- [x] `useTranslation()` works in any component; the landing page uses it.
- [x] A simple language switcher in the header lets the user pick `pl` or
      `en`. The choice is persisted in `localStorage`.
- [x] Date and number formatting in the example route uses
      `Intl.DateTimeFormat` / `Intl.NumberFormat` with the active locale.
- [x] A lint rule (or a CI check) flags any string literal that looks like
      user-visible text but is not wrapped in `t(...)`. (If lint can't catch it
      cheaply, document the convention in `apps/web/AGENTS.md` and move on.)
- [x] `apps/web/AGENTS.md` documents the namespace conventions:
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

## Notes

- **Resources are bundled, not lazy-loaded.** The four locale JSON files are
  imported into `src/i18n/index.ts` so `i18next.init` resolves synchronously and
  no async backend / Suspense boundary is needed. `react: { useSuspense: false }`
  keeps render (and tests) synchronous.
- **Type-safe keys.** `src/i18n/i18next.d.ts` augments `CustomTypeOptions` from
  the `en` resources, so `t()` autocompletes keys and a typo or a key missing
  from `en` is a compile error.
- **JSON is nested, not flat-dotted.** Keys are nested objects addressed by
  i18next's default `.` separator (`preview.today`), since flat `"a.b"` keys
  would collide with that separator.
- **"Example route" = the landing page.** TanStack Router (T-009) is not merged
  yet, so the `Intl` date/number demo lives on the landing card via the
  `src/lib/format.ts` helpers keyed to `i18n.resolvedLanguage`.
- **Lint guard.** `react/jsx-no-literals` (built into the already-installed
  `eslint-plugin-react`, no new dep) is enabled for `src/**/*.tsx` (tests
  exempt) — verified it errors on an untranslated JSX literal.
- **UI not visually verified:** `agent-browser`/Chrome is unavailable in this
  environment. Behaviour is covered by tests: `App.test.tsx` (translated copy +
  switcher present), `LanguageSwitcher.test.tsx` (language change + localStorage
  persistence), `format.test.ts` (locale-specific Intl output).
- **Pre-existing, untouched:** `src/styles/globals.css` fails `prettier --check`
  on `main`; left as-is per minimal blast radius.

## References

- ADR: [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
