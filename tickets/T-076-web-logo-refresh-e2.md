---
id: T-076
title: Web logo refresh - minimalist E2 mark
status: in_progress
priority: low
size: S
spec_version: 1
owner: Codex
dependencies: []
labels: [web, branding]
created_at: 2026-06-30
updated_at: 2026-06-30
closed_at: ~
---

# T-076 - Web logo refresh - minimalist E2 mark

## Goal

Replace the current awkward web logo with a simpler minimalist E2 capsule mark that reads cleanly in both light and dark themes.

## Context

The current `AppLogo` and `favicon.svg` use an older abstract symbol that is not aligned with the current redesign direction. This ticket applies the user-selected E2 direction as a small, SVG-first brand refresh for the web app surface.

## Contract

Apply the same logo family to the web UI header/login surface and the browser favicon, using a monochrome SVG mark that adapts to both themes.

### Endpoints / routes

| Method | Path  | Auth  | Success | Errors |
| ------ | ----- | ----- | ------- | ------ |
| _n/a_  | _n/a_ | _n/a_ | _n/a_   | _n/a_  |

### Request / response shapes

_n/a_

### Provides

- `apps/web/src/components/AppLogo.tsx` renders the new minimalist E2 mark via theme-safe `currentColor`.
- `apps/web/public/favicon.svg` uses the same mark with light/dark media-aware fill.

### Consumes

- Existing `common.appName` translations for the wordmark label.
- Existing `index.html` favicon link to `/favicon.svg`.

## Acceptance criteria

- [ ] The shared `AppLogo` component uses the new minimalist E2 capsule mark and inherits color from surrounding UI.
- [ ] The login screen and authenticated shell display the new mark.
- [ ] `apps/web/public/favicon.svg` matches the same mark and remains visible in both light and dark schemes.

## Test matrix

| Case                   | Input                      | Expected                               |
| ---------------------- | -------------------------- | -------------------------------------- |
| header branding        | authenticated shell render | new E2 mark appears next to `CarNotea` |
| login branding         | `/login` render            | new E2 mark appears above `CarNotea`   |
| favicon theme contrast | browser light/dark scheme  | favicon fill switches for contrast     |

## Files to touch

- `apps/web/src/components/AppLogo.tsx`
- `apps/web/src/routes/login.tsx`
- `apps/web/public/favicon.svg`

## Out of scope

- Regenerating the full PNG PWA icon set.
- Changing the app name or other copy.

## Implementation notes

- Keep the logo SVG extremely small and geometric so it survives favicon-scale rendering.
- Prefer fills and masking over thin strokes for better small-size consistency.

## Verification

- `pnpm --filter @carnotea/web lint` -> passes
- `pnpm --filter @carnotea/web typecheck` -> passes
- `pnpm --filter @carnotea/web test` -> passes

## References

- ADR: [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
- Related tickets: [T-012](./T-012-web-pwa-installable.md), [T-069](./T-069-redesign-cockpit-logbook.md)
