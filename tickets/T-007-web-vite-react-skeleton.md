---
id: T-007
title: Web skeleton — Vite + React + TS
status: ready
priority: high
owner: ~
dependencies: [T-001, T-003]
labels: [bootstrap, web]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-007 — Web skeleton: Vite + React + TS

## Goal

Scaffold `apps/web` as a Vite + React + TypeScript SPA with a single landing
page that says "CarNotea" and proves the build pipeline works end to end.

## Context

The web app needs to exist before we can wire routing, styling, data, i18n,
PWA, and auth into it. This ticket delivers the smallest runnable React app.

## Acceptance criteria

- [ ] `apps/web/` exists as `@carnotea/web`.
- [ ] tsconfig extends `@carnotea/tsconfig/react.json`.
- [ ] ESLint extends the `react` config from `@carnotea/eslint-config`.
- [ ] `pnpm --filter @carnotea/web dev` serves the app on `5173` with HMR.
- [ ] `pnpm --filter @carnotea/web build` produces a deployable static bundle
      in `apps/web/dist`.
- [ ] The landing page displays the app name and the current i18n placeholder
      (just "CarNotea" for now — i18n proper comes in T-010).
- [ ] A Vitest example test verifies the root component renders.
- [ ] `apps/web/AGENTS.md` exists with web-specific rules.

## Files to touch

- `apps/web/**`
- `turbo.json` (ensure `dev`, `build`, `test` pipelines include it)

## Out of scope

- Routing (T-009).
- Tailwind / shadcn (T-008).
- TanStack Query (T-009).
- i18n (T-010).
- PWA (T-012).
- API client (T-011).
- Auth UI.

## Implementation notes

- Use `vite@latest` with the React TS template as a _starting point_, but
  prune everything we don't use. The committed scaffolding must be lean — no
  stock logos, no "edit src/App.tsx to get started" boilerplate.
- The placeholder UI is intentionally bare. Resist the urge to "just add a
  header while I'm here" — that work lives in later tickets.

## References

- ADR: [ADR-0005](../docs/adr/0005-vite-react-no-nextjs.md)
