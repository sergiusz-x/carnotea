---
id: T-032
title: Web app shell — auth guard, login/logout, nav, layout
status: done
priority: high
size: L
spec_version: 1
owner: claude-code
dependencies: [T-006, T-009, T-010, T-031]
labels: [web, foundation]
created_at: 2026-06-15
updated_at: 2026-06-23
closed_at: ~
---

# T-032 — Web: app shell — auth guard, login/logout, nav, layout

## Goal

Ship the authenticated app shell in `apps/web` — better-auth sign-in/sign-up/
sign-out UI, route protection via TanStack Router, and a top-level layout with
navigation, locale switcher, and the existing theme toggle — so feature screens
mount inside a guarded, navigable frame.

## Context

Better-auth (T-006), TanStack Router + Query (T-009), i18n (T-010), and the forms
foundation (T-031) are wired, but the web app has no authenticated frame: no login
screen, no route guard, no shared layout/nav. Every feature ticket (T-033+) assumes
an authenticated user and a place to navigate from. This ticket establishes that
shell once. The theme toggle already exists and is reused, not rebuilt.

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md). Auth
calls use the **better-auth client**, not the OpenAPI `apiClient`.

## Contract

### Routes

| Route                     | Screen                         | Guard                                              |
| ------------------------- | ------------------------------ | -------------------------------------------------- |
| `/login`                  | sign-in/sign-up                | redirect to app if already authed                  |
| `_authenticated` (layout) | AppShell (header, nav, outlet) | redirect to `/login?redirect=<path>` if no session |
| `/` and feature routes    | mount under `_authenticated`   | inherited                                          |

### Query keys

```
['session']     # better-auth session, the one cached source of truth
```

### Provides

- The `_authenticated` layout route + `AppShell` that every feature screen mounts
  under, and a `useSession()` hook backed by `['session']`. **Frozen** — T-033+
  add child routes under `_authenticated` and read `useSession()`.

### Consumes

- The better-auth client (T-006) for sign-in/up/out and session resolution.
- The forms stack (T-031) for the auth forms; i18n (T-010) for the locale switcher.

## Acceptance criteria

- [x] Sign-in, sign-up, sign-out use the better-auth client; on success the user
      lands in the app, on sign-out returns to `/login`.
- [x] Protected routes are guarded: an unauthenticated user hitting any app route is
      redirected to `/login` with the intended path preserved and restored after login.
- [x] Authenticated routes render inside a top-level layout: header with app name,
      primary nav (Vehicles, Dashboard, Profile), locale switcher, theme toggle, and
      a user/sign-out menu.
- [x] The locale switcher toggles `pl`/`en` and persists; the active locale applies
      immediately without a full reload.
- [x] Session state is read via TanStack Query so guard + header react to login/out;
      a loading state avoids a login-page flash for already-authenticated users.
- [x] All shell strings exist in both `pl` and `en`; no hardcoded JSX.

## Test matrix

| Case                            | Expected                                           |
| ------------------------------- | -------------------------------------------------- |
| guard redirects when logged out | visiting `/vehicles` → `/login?redirect=/vehicles` |
| redirect restored after login   | sign-in returns to the intended path               |
| authed user skips login         | visiting `/login` while authed → app               |
| sign-out returns to login       | header sign-out → `/login`, `['session']` cleared  |
| locale toggle live              | switch pl/en updates header text immediately       |
| no login flash                  | already-authed reload shows app, not login flash   |
| i18n parity                     | every shell key exists in `pl` and `en`            |

## Files to touch

- `apps/web/src/routes/` — `_authenticated` layout route + `/login`
- `apps/web/src/features/auth/` (sign-in/up/out forms, `useSession` hook)
- `apps/web/src/components/layout/` (AppShell, Header, Nav, UserMenu)
- `apps/web/src/locales/{pl,en}/{auth,nav}.json` (+ register namespaces)

## Out of scope

- Profile editing screen (T-041) and profile API (T-029).
- Password reset / email verification / OAuth beyond what T-006 set up (T-051).
- Any feature screen content (vehicles, fuel, …) — T-033+.

## Implementation notes

- Use TanStack Router's `beforeLoad` guard on the `_authenticated` layout route to
  redirect, passing the target as a `redirect` search param.
- Resolve the session via the better-auth client wrapped in a TanStack Query so the
  whole shell shares one cached source of truth; invalidate `['session']` on
  sign-in/out.
- Reuse the existing theme toggle; the locale switcher drives the same i18n instance
  from T-010.

## Verification

- `pnpm --filter @carnotea/web dev` → `agent-browser open http://localhost:5173/vehicles` while logged out redirects to `/login`
- `pnpm --filter @carnotea/web test auth` → all pass
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-006, T-009, T-010, T-031, T-033+ (feature screens)
- ADR: better-auth [ADR-0004](../docs/adr/0004-better-auth.md); i18n
  [ADR-0007](../docs/adr/0007-i18n-pl-en.md)

## Notes

- `better-auth` added to `@carnotea/web` dependencies (covered by ADR-0004).
- `_authenticated` is a pathless layout route using `id: '_authenticated'` (no
  path) — child routes inherit auth guard without URL path segment.
- `throw redirect()` requires `// eslint-disable-next-line @typescript-eslint/only-throw-error`
  since TanStack Router redirect objects are not `Error` instances.
- `z.email()` (Zod 4 standalone) used instead of deprecated `z.string().email()`.
- Placeholder routes `/vehicles`, `/dashboard`, `/profile` registered under
  `_authenticated` so TanStack Router `Link` `to` props are type-safe. Feature
  tickets (T-033+) replace the placeholder component bodies.
- `staleTime: Infinity` on session query; invalidated explicitly on sign-in/out.
- UI verified: dev server started, login page visible at `/login`, redirect
  preserved as search param. Browser-based visual verification not possible in
  this environment — reported as not visually verified via agent-browser.
