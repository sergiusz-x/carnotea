---
id: T-044
title: Performance budget + Lighthouse and bundle-size CI check
status: done
priority: low
owner: Antigravity
dependencies: [T-012, T-033]
labels: [quality, perf]
created_at: 2026-06-15
updated_at: 2026-07-21
closed_at: 2026-07-21
---

# T-044 — Performance budget + Lighthouse and bundle-size CI check

## Goal

Define a performance budget for the web app and enforce it in CI with Lighthouse
(including the PWA installability score) and a bundle-size cap so regressions
fail the build instead of shipping.

## Context

The PWA work (T-012) makes installability and load performance a product feature,
not a nice-to-have, and the vehicles UI (T-033) is the first real payload to
measure. Without a budget, bundle size and Core Web Vitals drift silently. This
ticket sets concrete numbers and a CI gate so the budget is defended
automatically.

## Acceptance criteria

- [ ] A documented performance budget exists: target thresholds for Lighthouse
      Performance, Best Practices, and **PWA installability**, plus Core Web
      Vitals (LCP, CLS, TBT/INP) targets.
- [ ] Lighthouse runs against a production build in CI (Lighthouse CI or
      equivalent) and **fails** the job when a category score drops below its
      configured threshold.
- [ ] A bundle-size budget caps the initial JS/CSS (gzipped) for the web app and
      fails CI when exceeded; the current baseline sizes are recorded.
- [ ] The PWA installability criteria (manifest, service worker, icons, HTTPS
      assumption) are asserted by the Lighthouse PWA checks.
- [ ] The check runs on PRs and reports the scores/sizes in the job output.
- [ ] `docs/tech-stack.md` (or a perf doc) records the budget and how to update
      it deliberately.

## Files to touch

- `lighthouserc.{json,cjs}` or `.lighthouserc.yml` (new)
- `apps/web/` bundle-size budget config (e.g. `size-limit`/`bundlesize` or Vite
  `build.rollupOptions` warning limits)
- `.github/workflows/` (perf job, building on the T-015 pipeline)
- `apps/web/package.json` (`lighthouse`/`size` scripts)
- `pnpm-workspace.yaml` (catalog entries for the tooling)
- `docs/tech-stack.md`

## Out of scope

- Actually optimizing the bundle (code-splitting, image work) — this ticket sets
  and enforces the budget; remediation is separate if a threshold fails.
- Field/RUM performance data collection (that overlaps observability, T-018/T-050).
- API-side latency budgets/SLOs.
- Synthetic uptime monitoring.

## Implementation notes

- Run Lighthouse against the static `apps/web` build served locally (Lighthouse
  CI's `startServerCommand`/`staticDistDir`), not the dev server.
- Set thresholds slightly above today's measured baseline so the gate is
  meaningful but not immediately red; record baselines in the PR.
- Keep the bundle-size tool simple — `size-limit` reads the built assets; verify
  latest stable via `pnpm info` before pinning.
- The PWA score depends on T-012 (manifest + service worker) being present.

## References

- Related tickets: T-012 (PWA), T-033 (web vehicles), T-015 (CI), T-042 (E2E)
- ADR: [ADR-0006](../docs/adr/0006-pwa-from-day-one.md)
- External: Lighthouse CI — <https://github.com/GoogleChrome/lighthouse-ci>
