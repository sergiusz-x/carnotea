# ADR-0005: Vite + React for the web app (no Next.js)

- **Status**: accepted
- **Date**: 2026-06-13
- **Deciders**: Sergiusz, Claude

## Context

The web app is a personal logbook used by an authenticated user. It is not a
content site. There is no SEO requirement, no marketing landing page, and no
high-traffic anonymous browsing path. The primary mode of use is a phone with
the PWA installed.

The choice is between:

- Vite + React (SPA, easy PWA, no server rendering)
- Next.js (SSR/SSG built in, App Router, more server-side capabilities)

## Decision

We use **Vite + React + TypeScript** with **TanStack Router** for routing and
**TanStack Query** for server-state caching. We do not use Next.js.

The PWA layer is added on top via a service worker (Workbox or Vite's PWA
plugin), per ADR-0006.

## Consequences

### Positive

- Smallest reasonable web stack; the build is fast and the runtime is
  predictable.
- No Node server to run for the web tier in production - the API serves data,
  the web tier is a static bundle behind a CDN or nginx.
- PWA support is straightforward; we don't fight an SSR framework's hydration
  model.
- TanStack Router gives us code-based routing with strong types, which fits an
  app whose routes evolve as features are added.

### Negative

- We forfeit SSR. We won't be doing SEO on logged-in pages, which is fine.
- We forfeit RSC. We don't have a use case for them.
- We will need a tiny serve-static container (nginx or Caddy) at deploy time.

### Neutral

- If we ever need SSR for a marketing site, we can host it separately as a
  static page or a one-page Next.js project - it doesn't have to share the same
  bundle as the app.

## Alternatives considered

### Option A: Next.js (App Router)

Rejected. Heavier than we need for a logged-in PWA, complicates PWA setup, and
brings server-side runtime concerns we don't want at this stage.

### Option B: Remix

Rejected. Similar trade-offs to Next.js for our use case; we'd pay for SSR we
don't need.

### Option C: SvelteKit / Solid

Rejected. The wider ecosystem (shadcn/ui, react-hook-form, TanStack family) is
React-first. Going off-React would mean less battery-included tooling.
