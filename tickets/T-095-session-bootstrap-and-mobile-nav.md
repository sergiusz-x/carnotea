---
id: T-095
title: Harden session bootstrap and fix mobile bottom nav overflow
status: in_review
priority: high
size: M
spec_version: 1
owner: codex
dependencies: [T-032, T-045, T-094]
labels: [web, api, auth, pwa, mobile, bug]
created_at: 2026-07-12
updated_at: 2026-07-12
closed_at: ~
---

# T-095 — Harden session bootstrap and fix mobile bottom nav overflow

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Stop transient session-bootstrap failures from crashing the app shell, and make the mobile bottom navigation fit safely on rounded-corner phones without the redundant `Więcej` tab.

## Context

Production users occasionally see the default TanStack Router error screen with `Session request failed`. The current auth boot flow performs a blocking session fetch in route guards and treats any request failure as fatal.

Separately, the mobile bottom navigation overflows on devices like iPhone 15, clipping the right-most label. The bottom `Więcej` action also conflicts with the floating plus action because both present a bottom-sheet-style overflow surface.

## Contract

No public route or schema changes. The web app must make session bootstrap recoverable and the API must mark auth responses as non-cacheable.

### Endpoints / routes

| Method | Path                    | Auth    | Success                           | Errors             |
| ------ | ----------------------- | ------- | --------------------------------- | ------------------ |
| GET    | `/api/auth/get-session` | session | 200 current session or `null`     | existing auth errs |
| GET    | `/_authenticated/*`     | session | app shell or redirect to `/login` | recoverable UI     |
| GET    | `/login`                | guest   | login screen or redirect to `/`   | recoverable UI     |

### Request / response shapes

- No shared Zod schema changes.
- `/api/auth/*` responses keep their current payloads but must include `Cache-Control: no-store, no-cache, must-revalidate`.

### Provides

- Recoverable session bootstrap with retries and explicit retry/reload actions.
- Mobile bottom navigation that respects safe-area insets and no longer exposes the `Więcej` overflow tab.

### Consumes

- Existing better-auth browser client and `/api/auth/get-session` endpoint.
- Existing mobile shell layout, quick-add FAB, and active-vehicle context.

## Acceptance criteria

- [x] Transient or persistent `getSession()` failures no longer surface TanStack Router's default fatal error page; the user sees a recoverable session state instead.
- [x] Authenticated routes still redirect anonymous users to `/login`, and `/login` still redirects authenticated users away after session resolution.
- [x] Sign-in and sign-up flows handle post-auth session refresh failures gracefully instead of crashing.
- [x] `/api/auth/get-session` responses are explicitly non-cacheable.
- [x] Mobile bottom navigation respects safe-area insets, no longer clips the right-most label on rounded-corner phones, and no longer shows the redundant `Więcej` tab.
- [x] The floating plus action is labeled as quick add rather than `Więcej`.

## Test matrix

| Case                              | Input                                       | Expected                                                  |
| --------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| authenticated bootstrap success   | valid session on `/_authenticated/vehicles` | shell renders                                             |
| anonymous bootstrap success       | no session on `/_authenticated/vehicles`    | redirect to `/login?redirect=...`                         |
| session transport failure         | `authClient.getSession()` returns error     | recoverable session state, no default router error screen |
| login route bootstrap failure     | session fetch error on `/login`             | recoverable session state, no default router error screen |
| post-sign-in session refresh fail | sign-in succeeds, session refresh fails     | form shows recoverable error instead of crashing          |
| auth cache headers                | GET `/api/auth/get-session`                 | `Cache-Control: no-store, no-cache, must-revalidate`      |
| mobile nav overflow regression    | mobile viewport with right safe area        | right-most tab remains visible and overflow tab is absent |

## Files to touch

- `apps/web/src/features/auth/*`
- `apps/web/src/routes/_authenticated.tsx`
- `apps/web/src/routes/login.tsx`
- `apps/web/src/components/layout/{app-shell,bottom-nav,fab,quick-add-sheet}.tsx`
- `apps/web/src/locales/{pl,en}/{auth,nav}.json`
- `apps/web/src/components/layout/bottom-nav.test.tsx`
- `apps/web/src/features/auth/auth-shell.test.tsx`
- `apps/api/src/auth/{auth.module,auth.module.test}.ts`

## Out of scope

- Reworking the broader mobile information architecture beyond the affected bottom navigation.
- Offline auth/session support.
- Service-worker caching changes outside the auth/session path.

## Implementation notes

- Keep the fix at the auth/session seam rather than weakening route protection semantics.
- Prefer query prefetching and component-level recovery over throwing from route guards.
- Safe-area support should cover left, right, and bottom insets.

## Verification

- `pnpm --filter @carnotea/api test -- src/auth/auth.module.test.ts` → pass
- `pnpm --filter @carnotea/web test -- src/features/auth/auth-shell.test.tsx src/components/layout/bottom-nav.test.tsx` → pass
- `pnpm lint` → pass
- `pnpm typecheck` → pass
- `pnpm test` → pass
- `pnpm build` → pass

## References

- Related tickets: T-032, T-045, T-092, T-093, T-094
- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Docs: [architecture](../docs/architecture.md), [deployment](../docs/deployment.md)
