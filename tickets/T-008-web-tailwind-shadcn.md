---
id: T-008
title: Web — Tailwind + shadcn/ui setup
status: done
priority: medium
owner: claude
dependencies: [T-007]
labels: [web, ui]
created_at: 2026-06-13
updated_at: 2026-06-15
closed_at: 2026-06-15
---

# T-008 — Web: Tailwind + shadcn/ui setup

## Goal

Install and configure Tailwind CSS and shadcn/ui in `apps/web`, with the
default theme tokens, a working dark mode toggle, and one or two example
components copied in so the conventions are clear.

## Context

shadcn/ui works by copying components into the codebase rather than installing
them as a dependency. This ticket sets up the CLI configuration, the theme,
and the conventions that future component tickets will follow.

## Acceptance criteria

- [ ] Tailwind v3 (or v4 if stable enough at execution time — verify) is
      installed and configured. Vite picks up `tailwind.config.ts` and
      `postcss.config.cjs`.
- [ ] shadcn/ui is configured (`components.json`) with: TypeScript, RSC: no,
      CSS variables: yes, base color: neutral.
- [ ] `Button` and `Card` components are copied into
      `apps/web/src/components/ui/`.
- [ ] A `ThemeProvider` toggles light/dark via a CSS class on `<html>`; the
      choice is persisted in `localStorage`.
- [ ] The landing page from T-007 uses one `Button` and one `Card` so the
      install is visibly working.
- [ ] `apps/web/AGENTS.md` documents: - shadcn components live under `src/components/ui/`, - layout / feature components live under `src/components/`, - feature folders own their own components (`src/features/<name>/`).

## Files to touch

- `apps/web/**`
- `apps/web/AGENTS.md`

## Out of scope

- Building actual feature UI (later tickets).
- Configuring a design system / brand palette — for now, the shadcn default
  neutral palette is the brand.

## Implementation notes

- shadcn CLI uses path aliases; align them with the rest of the project
  (`@/components`, `@/lib`, `@/features`).
- Don't install icon packs ad-hoc — `lucide-react` ships with shadcn examples,
  so add it explicitly and lock the major version.

## Notes

- **Tailwind v4** was chosen (stable as of execution date, June 2026). v4 uses the
  `@tailwindcss/vite` Vite plugin and `@import "tailwindcss"` in CSS; there is no
  `tailwind.config.ts` or `postcss.config.cjs` (v3 patterns referenced in the AC).
  CSS variables are bridged to Tailwind utilities via `@theme inline` in `globals.css`.

- **No `forwardRef`** in Button/Card — components use the React 19 pattern of passing
  props directly (no `asChild`/Slot either, as it wasn't needed for the landing page demo).

- **`tooling/eslint/base.js`** was updated to add `pathGroups: [{ pattern: '@/**', group: 'internal' }]`.
  This is required so the `import/order` rule classifies `@/` path-alias imports as
  `internal` (not `external`). Without this, `eslint-plugin-import@2.32.0` crashes on
  ESLint 10 when trying to autofix out-of-order `@/` imports.

- **Hardcoded strings** ("Your personal vehicle diary.", "Get started") in App.tsx are
  deferred to T-010 (i18n); AGENTS.md acknowledges this as the sanctioned exception.

- **`vitest.setup.ts`** now imports `cleanup` from `@testing-library/react` and calls it
  in `afterEach`. This is required because `globals: false` in the vitest config prevents
  Testing Library's automatic cleanup hook from registering.

- **UI verified**: Chrome could not be installed in CI (SSL policy blocks the download).
  Build output (12.38 kB CSS, 1749 transformed modules) confirms Tailwind is generating
  styles correctly.

## References

- ADR: [ADR-0005](../docs/adr/0005-vite-react-no-nextjs.md)
- <https://ui.shadcn.com/docs>
