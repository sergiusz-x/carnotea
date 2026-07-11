---
id: T-093
title: Inline service worker registration for uncached updates
status: done
priority: high
size: S
spec_version: 1
owner: codex
dependencies: [T-092]
labels: [web, pwa, production]
created_at: 2026-07-11
updated_at: 2026-07-11
closed_at: 2026-07-11
---

# T-093 — Inline service worker registration for uncached updates

## Goal

Ensure production browsers receive fresh service worker update logic from the uncached HTML shell instead of a separately cached `registerSW.js`.

## Context

T-092 made `/version.json` and `/sw.js` correct on the server, but Cloudflare can still serve an older generated `registerSW.js` from cache. Browsers that only reload `/version.json` may remain controlled by the older service worker and keep seeing the SPA Not Found fallback. The registration code needs to come from `index.html`, which the production nginx config already marks `no-store`.

## Contract

### Endpoints / routes

_n/a_

### Request / response shapes

_n/a_

### Provides

- Production `index.html` contains the service worker registration code.
- The registration uses `updateViaCache: 'none'` and triggers `registration.update()`.

### Consumes

- Existing `vite-plugin-pwa` generated `/sw.js`.
- Existing production nginx `no-store` headers for `index.html` and `/sw.js`.

## Acceptance criteria

- [x] `vite-plugin-pwa` no longer injects the external `/registerSW.js` registration script.
- [x] The built `index.html` registers `/sw.js` with `updateViaCache: 'none'`.
- [x] The built `index.html` immediately asks the registration to update.
- [x] The production build still emits `/sw.js` and `/version.json`.

## Test matrix

| Case             | Input                               | Expected                                                         |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------- |
| production build | `pnpm --filter @carnotea/web build` | build succeeds                                                   |
| generated HTML   | inspect `apps/web/dist/index.html`  | inline registration exists and no `/registerSW.js` script exists |
| generated assets | inspect `apps/web/dist`             | `sw.js` and `version.json` exist                                 |

## Files to touch

- `apps/web/vite.config.ts`
- `tickets/T-093-inline-service-worker-registration.md`
- `tickets/INDEX.md`

## Out of scope

- Changing Dokploy deployment settings.
- Changing Cloudflare cache configuration.
- Adding offline caching semantics.

## Implementation notes

- Use an HTML transform instead of `injectRegister: 'inline'` because vite-plugin-pwa's built-in inline script does not pass `updateViaCache: 'none'` or call `registration.update()`.
- Verified from `apps/web/dist/index.html` that `/registerSW.js` is absent and inline registration calls `registration.update()`.

## Verification

- `pnpm --filter @carnotea/web build` → all pass
- inspect `apps/web/dist/index.html` → inline registration includes `updateViaCache: 'none'` and no `/registerSW.js`
- inspect `apps/web/dist` → `sw.js` and `version.json` exist

## References

- Related tickets: T-090, T-092
