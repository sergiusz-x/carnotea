---
id: T-008
title: Web — Tailwind + shadcn/ui setup
status: ready
priority: medium
owner: ~
dependencies: [T-007]
labels: [web, ui]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
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

## References

- ADR: [ADR-0005](../docs/adr/0005-vite-react-no-nextjs.md)
- <https://ui.shadcn.com/docs>
