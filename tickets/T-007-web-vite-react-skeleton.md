---
id: T-007
title: Web skeleton — Vite + React + TS
status: done
priority: high
owner: Claude
dependencies: [T-001, T-003]
labels: [bootstrap, web]
created_at: 2026-06-13
updated_at: 2026-06-15
closed_at: 2026-06-15
---

# T-007 — Web skeleton: Vite + React + TS

## Goal

Scaffold `apps/web` as a Vite + React + TypeScript SPA with a single landing
page that says "CarNotea" and proves the build pipeline works end to end.

## Context

The web app needs to exist before we can wire routing, styling, data, i18n,
PWA, and auth into it. This ticket delivers the smallest runnable React app.

## Acceptance criteria

- [x] `apps/web/` exists as `@carnotea/web`.
- [x] tsconfig extends `@carnotea/tsconfig/react.json`.
- [x] ESLint extends the `react` config from `@carnotea/eslint-config`.
- [x] `pnpm --filter @carnotea/web dev` serves the app on `5173` with HMR.
- [x] `pnpm --filter @carnotea/web build` produces a deployable static bundle
      in `apps/web/dist`.
- [x] The landing page displays the app name and the current i18n placeholder
      (just "CarNotea" for now — i18n proper comes in T-010).
- [x] A Vitest example test verifies the root component renders.
- [x] `apps/web/AGENTS.md` exists with web-specific rules.

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

## Notes

- **Stack:** Vite 8 + React 19 + TypeScript. `@vitejs/plugin-react` (oxc, no
  babel). Tests run on Vitest + jsdom + Testing Library; the app's
  `vitest.config.ts` merges `@carnotea/vitest-config` and overrides the
  environment to `jsdom` plus a `vitest.setup.ts` that registers
  `@testing-library/jest-dom`.
- **No `turbo.json` change:** the root `build`/`dev`/`test`/`lint`/`typecheck`
  tasks already apply to `apps/*` via the workspace glob, and `dist/**` is
  already a declared `build` output. The skeleton imports no workspace package,
  so the default `^build` ordering is sufficient.
- **Shared-tooling fixes (first oxc/React/ESLint-10 consumer surfaced latent
  bugs; approved to fix at the root):**
  1. `tooling/typescript/base.json` now holds the compiler options directly and
     the repo-root `tsconfig.base.json` re-exports it by relative path. Vite's
     oxc transformer resolved the old `extends: "../../tsconfig.base.json"`
     through the pnpm symlink without dereferencing it, so it escaped the
     package and `vite build`/`vitest` failed with "Tsconfig not found". `tsc`
     was unaffected. The web tsconfig still extends `@carnotea/tsconfig/react.json`.
  2. `tooling/eslint/react.js` pins `settings.react.version: '19.0'` instead of
     `'detect'`: `eslint-plugin-react@7.37.5`'s autodetect calls the removed
     ESLint 9 `context.getFilename()` API and crashes on ESLint 10.
  3. `tooling/eslint/base.js` ignores `**/*.d.ts`: hand-written declaration
     files (e.g. `tooling/vitest/base.d.ts`) live outside any tsconfig
     `include`, so the typed project service rejected them.
  4. Added `tooling/vitest/base.d.ts` so `@carnotea/vitest-config` is typed when
     imported from a TS config.
- **Pre-existing, out of scope:** `pnpm format:check` reports two unformatted
  files in `packages/shared` (`src/constants/fuel-types.ts`,
  `src/constants/issue-statuses.ts`) committed in T-003 (`a477daf`) before CI
  (T-015) existed. They are unrelated to this ticket and were left untouched —
  worth a small follow-up.
- **UI verification:** `agent-browser` is not available in this remote
  container, so the dev server was checked over HTTP instead: `GET /` → 200 with
  `<title>CarNotea</title>`, the Vite HMR client (`/@vite/client`) and React
  Refresh injected, and `main.tsx`/`App.tsx` transform without error. The
  rendered `CarNotea` heading is asserted by the jsdom test. A live in-browser
  HMR edit/reload was not visually confirmed.

## References

- ADR: [ADR-0005](../docs/adr/0005-vite-react-no-nextjs.md)
