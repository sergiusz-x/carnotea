---
id: T-012
title: Web — PWA manifest + minimal service worker
status: ready
priority: medium
owner: ~
dependencies: [T-007, T-008]
labels: [web, pwa]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-012 — Web: PWA manifest + minimal service worker

## Goal

Make `apps/web` installable as a PWA on desktop and mobile: a complete
`manifest.webmanifest`, a full icon set (192, 384, 512, maskable, Apple
touch), the correct meta tags, and a service worker that satisfies the
"installable" requirement.

## Context

ADR-0006 commits to PWA from day one but defers offline / push to later
tickets. This ticket implements the _installable_ baseline.

## Acceptance criteria

- [ ] `apps/web/public/manifest.webmanifest` exists with: `name`, `short_name`
      (≤12 chars), `description` (pl + en via per-locale manifest? document
      the choice), `start_url: "/"`, `display: "standalone"`, `theme_color`,
      `background_color`, full icon set.
- [ ] Icons exist as `apps/web/public/icons/icon-192.png`, `-384.png`,
      `-512.png`, `-maskable-512.png`, `-apple-touch-180.png`. Placeholder
      art is acceptable (the brand decision happens elsewhere).
- [ ] `index.html` includes `<link rel="manifest">`,
      `<meta name="theme-color">`, `<link rel="apple-touch-icon">` and the
      iOS-specific meta tags.
- [ ] A minimal service worker is registered (Vite PWA plugin OR a hand-rolled
      `sw.js`) that does _not_ cache API responses. It exists solely to make
      the install prompt fire.
- [ ] The Chrome devtools "Application > Manifest" tab shows no warnings on
      the built app.
- [ ] Lighthouse PWA audit on the built app passes "Installable".
- [ ] `apps/web/AGENTS.md` documents: "do not add offline caching, background
      sync, or push notifications in this ticket — those live behind their own
      ADRs and tickets".

## Files to touch

- `apps/web/public/**`
- `apps/web/index.html`
- `apps/web/vite.config.ts` (PWA plugin or manual SW registration)
- `apps/web/AGENTS.md`

## Out of scope

- Offline-first behaviour.
- Background sync.
- Push notifications.
- Brand-quality icons (placeholder art is fine).

## Implementation notes

- `vite-plugin-pwa` with `registerType: 'autoUpdate'` and `workbox: { runtimeCaching: [] }`
  achieves the "installable, but no API caching" baseline cleanly.
- If the manifest needs to be localised, prefer a single manifest with PL
  `name` and EN `short_name` rather than per-locale manifests (which most
  browsers don't fully support).

## References

- ADR: [ADR-0006](../docs/adr/0006-pwa-from-day-one.md)
- <https://web.dev/articles/install-criteria>
