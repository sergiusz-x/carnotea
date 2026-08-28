# ADR-0016: Public product landing in the existing Vite SPA

- **Status**: accepted
- **Date**: 2026-08-26
- **Deciders**: Sergiusz, Codex

## Context

ADR-0005 correctly selected Vite + React for CarNotea when the product had no anonymous presentation path. CarNotea is now deployed publicly and needs to explain its value before an account is created. The product owner wants a landing page, real application previews, and accurate sharing metadata while keeping the current simple static deployment.

## Decision

The existing Vite SPA serves the public landing at `/` for visitors without a session. A visitor with a valid session is sent straight to the authenticated dashboard. The landing is a small product page, not a content platform: it is bilingual, uses real reproducible screenshots, includes static sharing metadata, and does not add SSR, Next.js, a new runtime, or a separate frontend.

## Consequences

- The public root route makes the product understandable before sign-in.
- Social previews and basic discoverability improve despite the SPA runtime.
- Authenticated routes remain intentionally client-rendered and are not SEO targets.
- Landing updates remain part of the same web build and deployment lifecycle.

## Alternatives considered

### Separate SSR marketing site

Rejected. It adds hosting, design, and content-maintenance overhead before there is evidence that CarNotea needs a broad content site.

### Keep `/` as an authentication redirect

Rejected. It hides the product from visitors arriving through GitHub or a shared link and gives no reason to create an account.
