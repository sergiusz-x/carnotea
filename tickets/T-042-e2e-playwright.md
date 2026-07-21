---
id: T-042
title: End-to-end tests with Playwright for the critical path
status: in_progress
priority: medium
owner: Antigravity
dependencies: [T-032, T-033]
labels: [quality, testing]
created_at: 2026-06-15
updated_at: 2026-07-21
closed_at: ~
---

# T-042 — End-to-end tests with Playwright for the critical path

## Goal

Stand up Playwright and cover the one user journey that proves the app works
end-to-end: sign in → create a vehicle → add a fuel log → see it on the
dashboard.

## Context

Unit and integration tests (Vitest) exist per package, but nothing exercises the
real browser → web → API → Postgres path. With the app shell (T-032) and the
vehicles UI (T-033) landed, the happy path is finally walkable, so a thin E2E
suite now guards every future refactor against silent breakage of the critical
flow. `turbo.json` already declares `test:e2e` with `playwright-report/**` and
`test-results/**` outputs — this ticket fills it in.

## Acceptance criteria

- [ ] Playwright is installed at the repo root (or in `apps/web`) with a
      `playwright.config.ts` that starts the web dev/preview server and points
      tests at a running API + Postgres.
- [ ] A single spec covers the critical path: sign in, create a vehicle, add a
      fuel log, assert the entry is visible on the dashboard.
- [ ] Test data is isolated and idempotent — each run creates and cleans up its
      own user/vehicle so reruns don't collide.
- [ ] `pnpm test:e2e` runs the suite via Turborepo and produces the HTML report
      into `playwright-report/` (already declared as a turbo output).
- [ ] The suite is runnable headless in CI and locally with `--headed`/`--ui`.
- [ ] Flaky-by-default waits are avoided — use Playwright auto-waiting/web-first
      assertions, no fixed `sleep`s.
- [ ] `docs/getting-started.md` documents how to run E2E tests locally.

## Files to touch

- `playwright.config.ts` (new)
- `apps/web/e2e/critical-path.spec.ts` (new)
- `apps/web/e2e/fixtures/` (test user/db helpers, new)
- `apps/web/package.json` (`test:e2e` script, Playwright dep)
- `pnpm-workspace.yaml` (catalog entry for `@playwright/test`)
- `.gitignore` (`playwright-report/`, `test-results/`)
- `docs/getting-started.md`

## Out of scope

- Visual-regression / screenshot diffing.
- Cross-browser matrix beyond the default Chromium project.
- Wiring E2E into the CI workflow (its own concern; this ticket makes it
  runnable, T-015's pipeline can adopt it later).
- Accessibility/perf assertions inside E2E — see T-043 / T-044.

## Implementation notes

- Verify the latest stable `@playwright/test` via `pnpm info` before pinning.
- Prefer `webServer` in the Playwright config to boot the web preview; assume a
  separately-running API + Postgres (document the prerequisites).
- Seed/cleanup test data through the API or a throwaway DB, never against a
  shared dev database.
- Keep selectors resilient: prefer roles/labels (`getByRole`) over CSS, which
  also dovetails with the a11y work in T-043.

## References

- Related tickets: T-032 (web app shell), T-033 (web vehicles),
  T-043 (a11y), T-044 (performance budget)
- External: Playwright — <https://playwright.dev/>

## Notes

- Included `e2e/**/*` in `apps/web/tsconfig.json` to ensure ESLint can resolve the typescript files for type-aware linting.
- The `testUser` fixture generates a random user ID and deletes it directly via `@carnotea/db` to guarantee idempotency and avoid leaving unused test users.
- Placed Playwright fully in `apps/web` (including `playwright.config.ts`) as that aligns with Turborepo script mappings (`pnpm --filter @carnotea/web test:e2e`).
