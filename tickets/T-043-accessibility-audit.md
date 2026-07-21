---
id: T-043
title: Accessibility pass across the web app
status: in_progress
priority: medium
owner: Antigravity
dependencies: [T-033]
labels: [quality, a11y]
created_at: 2026-06-15
updated_at: 2026-07-21
closed_at: ~
---

# T-043 — Accessibility pass across the web app

## Goal

Make the core screens usable with a keyboard and a screen reader, and add
automated axe checks so accessibility regressions are caught in the test run.

## Context

`eslint-plugin-jsx-a11y` already flags static markup issues, but it can't see
focus order, runtime roles, or color contrast. Now that the vehicles UI (T-033)
gives us real, interactive screens, this ticket does a one-time audit and locks
in the result with automated checks so a11y stops being a manual afterthought.

## Acceptance criteria

- [ ] Every interactive control on the core screens (auth, vehicles list/form,
      dashboard, nav) is reachable and operable by keyboard alone, in a logical
      tab order.
- [ ] Focus is managed on route change and on dialog/menu open/close (focus
      moves in, is trapped where appropriate, and returns on close).
- [ ] Semantic roles/landmarks are correct: one `main`, labelled nav, headings
      in order, form inputs associated with `<label>`s, buttons vs links used
      correctly.
- [ ] Color contrast meets WCAG 2.1 AA for **both** light and dark themes
      (text, icons, focus indicators).
- [ ] Automated `axe-core` checks run against the core screens — either as
      `@axe-core/playwright` assertions in the E2E suite (T-042) or
      `jest-axe`/`vitest-axe` in component tests — and pass with no violations.
- [ ] A visible focus indicator is present and not suppressed by `outline: none`
      without a replacement.
- [ ] Any new aria-related strings are present in both `pl` and `en`.

## Files to touch

- `apps/web/src/**` (components/pages needing focus management & roles)
- `apps/web/src/styles/` (focus-visible styles, contrast tokens)
- `apps/web/e2e/` or `apps/web/src/**/*.test.tsx` (axe checks)
- `apps/web/src/i18n/{pl,en}.*` (aria/label strings)
- `pnpm-workspace.yaml` (catalog entry for the axe integration package)

## Out of scope

- A full WCAG AAA conformance program.
- Automated contrast enforcement in CI beyond the axe checks here.
- Internationalization beyond keeping new strings in pl + en (ADR-0007).
- Reworking the design system / token palette wholesale — only fix contrast
  failures found in the audit.

## Implementation notes

- Run axe against the same rendered screens the E2E suite drives to avoid a
  second harness; reuse Playwright fixtures from T-042 where possible.
- Contrast: check theme tokens, not one-off colors. Fix at the token layer so
  both themes inherit the correction.
- `getByRole` queries in tests double as a roles audit — broken roles surface as
  failing queries.
- Verify latest stable axe integration package via `pnpm info` before pinning.

## References

- Related tickets: T-033 (web vehicles), T-042 (E2E — axe host), T-044 (perf)
- ADR: [ADR-0007](../docs/adr/0007-i18n-pl-en.md) (aria strings in pl + en)
- External: axe-core — <https://github.com/dequelabs/axe-core>; WCAG 2.1 AA
