---
id: T-094
title: Activate waiting service worker updates
status: done
priority: high
size: S
spec_version: 1
owner: codex
dependencies: [T-093]
labels: [web, pwa, production]
created_at: 2026-07-11
updated_at: 2026-07-11
closed_at: 2026-07-11
---

# T-094 — Activate waiting service worker updates

## Goal

Make already-installed browsers activate the freshly fetched service worker instead of leaving it waiting behind the old controller.

## Context

T-093 moved service worker registration into uncached `index.html`, but the generated Workbox service worker still expects the page to send `SKIP_WAITING` when an update is waiting. Without that message, Brave and other Chromium browsers can keep the old service worker controlling `/version.json` and keep serving the stale SPA fallback.

## Contract

### Endpoints / routes

_n/a_

### Request / response shapes

_n/a_

### Provides

- The inline service worker registration posts `{ type: 'SKIP_WAITING' }` to a waiting worker.
- The page reloads once after `controllerchange` so the newly active service worker controls the page.
- The registration still bypasses HTTP cache for `/sw.js` with `updateViaCache: 'none'`.

### Consumes

- Existing `vite-plugin-pwa` generated `/sw.js` message handler for `SKIP_WAITING`.

## Acceptance criteria

- [x] Built `index.html` posts `SKIP_WAITING` to `registration.waiting`.
- [x] Built `index.html` listens for `controllerchange` and reloads once.
- [x] Built `index.html` still registers `/sw.js` with `updateViaCache: 'none'`.
- [x] Production build still emits `/sw.js` and `/version.json`.

## Test matrix

| Case             | Input                               | Expected                                                  |
| ---------------- | ----------------------------------- | --------------------------------------------------------- |
| production build | `pnpm --filter @carnotea/web build` | build succeeds                                            |
| generated HTML   | inspect `apps/web/dist/index.html`  | inline registration activates waiting SW and reloads once |
| generated assets | inspect `apps/web/dist`             | `sw.js` and `version.json` exist                          |

## Files to touch

- `apps/web/vite.config.ts`
- `tickets/T-094-activate-waiting-service-worker.md`
- `tickets/INDEX.md`

## Out of scope

- Changing Dokploy deployment settings.
- Changing Cloudflare cache configuration.
- Adding offline-first caching.

## Implementation notes

- The existing generated `/sw.js` already includes a `message` listener for `SKIP_WAITING`; the missing piece is sending that message from the page registration code.`n- Verified from `apps/web/dist/index.html`that the registration script contains`SKIP_WAITING`, `controllerchange`, `window.location.reload()`, and `updateViaCache: 'none'`.

## Verification

- `pnpm --filter @carnotea/web build` → all pass
- inspect `apps/web/dist/index.html` → contains `SKIP_WAITING`, `controllerchange`, `window.location.reload()`, and `updateViaCache: 'none'`
- inspect `apps/web/dist` → `sw.js` and `version.json` exist

## References

- Related tickets: T-092, T-093
