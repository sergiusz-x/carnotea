---
id: T-032
title: Web app shell — auth guard, login/logout, nav, layout
status: ready
priority: high
owner: ~
dependencies: [T-006, T-009, T-010]
labels: [web, foundation]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-032 — Web: app shell — auth guard, login/logout, nav, layout

## Goal

Ship the authenticated app shell in `apps/web` — better-auth sign-in/sign-up/
sign-out UI, route protection via TanStack Router, and a top-level layout with
navigation, locale switcher, and the existing theme toggle — so feature screens
mount inside a guarded, navigable frame.

## Context

Better-auth (T-006), TanStack Router + Query (T-009), and i18n (T-010) are wired,
but the web app has no authenticated frame: no login screen, no route guard, no
shared layout/nav. Every feature ticket (T-033+) assumes an authenticated user
and a place to navigate from. This ticket establishes that shell once. The theme
toggle already exists and is reused here, not rebuilt.

## Acceptance criteria

- [ ] Sign-in, sign-up, and sign-out flows use the better-auth client; on success
      the user lands in the authenticated app, on sign-out they return to login.
- [ ] Protected routes are guarded in TanStack Router: an unauthenticated user
      hitting any app route is redirected to `/login`, with the intended path
      preserved and restored after login.
- [ ] Authenticated routes render inside a top-level layout: header with app
      name, primary navigation (e.g. Vehicles, Dashboard, Profile), the locale
      switcher, the theme toggle, and a user/sign-out menu.
- [ ] The locale switcher toggles `pl`/`en` and persists the choice (reused by all
      screens); the active locale is reflected immediately without a full reload.
- [ ] Auth/session state is read via TanStack Query so the guard and header
      reflect login/logout reactively; a loading state avoids a login-page flash
      for already-authenticated users.
- [ ] All shell strings (nav labels, auth form labels/errors, menu items) exist in
      both `pl` and `en`; no hardcoded JSX strings.
- [ ] Verified in agent-browser: visiting a protected route while logged out
      redirects to login; signing in reaches the app; sign-out returns to login;
      locale + theme toggles work. If Chrome is blocked, note the structural
      fallback.

## Files to touch

- `apps/web/src/routes/__root.tsx` / `_authenticated` layout route + `/login`
- `apps/web/src/features/auth/` (sign-in/up/out forms, `useSession` hook)
- `apps/web/src/components/layout/` (AppShell, Header, Nav, UserMenu, LocaleSwitcher)
- `apps/web/src/locales/{pl,en}/{auth,nav}.json`

## Out of scope

- Profile editing endpoints/screen (T-029 API, profile screen is a later web ticket).
- Password reset / email verification / OAuth providers beyond what T-006 set up.
- The forms foundation (T-031) — auth forms may use simple local state if T-031
  isn't a hard dependency; reuse it if available.
- Any feature screen content (vehicles, fuel, …) — T-033+.

## Implementation notes

- Use TanStack Router's `beforeLoad`/`loader` guard on an authenticated layout
  route to redirect unauthenticated users, passing the target as a `redirect`
  search param so login can return them.
- Resolve session via the better-auth client wrapped in a TanStack Query so the
  whole shell shares one cached source of truth; invalidate it on sign-in/out.
- Reuse the existing theme toggle component rather than duplicating it; the locale
  switcher should drive the same i18n instance configured in T-010.

## References

- Related tickets: T-006 (better-auth), T-009 (TanStack Router + Query),
  T-010 (i18n), T-031 (forms foundation), T-033+ (feature screens)
- ADR: better-auth — [ADR-0004](../docs/adr/0004-better-auth.md);
  i18n pl/en — [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
