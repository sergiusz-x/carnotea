# ADR-0006: PWA from day one, advanced features later

- **Status**: accepted
- **Date**: 2026-06-13
- **Deciders**: Sergiusz, Claude

## Context

The product target is "I open this on my phone and it feels like a real app."
That requires the web app to be installable as a PWA: a manifest, an icon set,
a service worker, and the right meta tags.

"Real PWA" can mean many things: installable, offline-capable, background-sync,
push notifications, web-share, file-system access. Each layer is more work.

## Decision

We ship the installable layer **from the first frontend ticket onward**:

- A complete `manifest.webmanifest` (name, short_name, icons, display, theme).
- An icon set (192, 384, 512, maskable).
- A minimal service worker so the browser treats the app as installable.
- The correct meta tags for iOS (`apple-touch-icon`, `apple-mobile-web-app-*`).

We **explicitly defer** the following to dedicated tickets and ADRs:

- Offline-first behaviour (caching API responses, queuing mutations).
- Background sync.
- Push notifications.
- Camera / file / location capabilities.

The service worker we ship initially does not cache API responses. It exists
solely to satisfy the "installable" requirement.

## Consequences

### Positive

- The phone install flow works from day one - it's part of the product feel.
- We don't pay the complexity cost of offline-first before we have real
  workflows to support offline.
- Adding offline caching later is additive; nothing in the initial setup
  prevents it.

### Negative

- A user installing the app on day one will not get an offline experience.
  That's an intentional, documented limitation.
- We must remember to revisit this once we have a stable feature set;
  retrofitting offline-first onto a mature app is harder than designing for it.

### Neutral

- Tooling: we use either the official `vite-plugin-pwa` (which wraps Workbox)
  or hand-roll the service worker. The choice belongs in T-012.

## Alternatives considered

### Option A: Skip PWA entirely for now

Rejected. PWA is a product requirement, not a feature toggle. Even the basic
installable layer changes how the app feels on a phone.

### Option B: Build offline-first from day one

Rejected. Premature. We don't yet know which queries and mutations users
actually run; building a sync layer for non-existent workflows guarantees
rework.
