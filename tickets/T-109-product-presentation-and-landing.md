---
id: T-109
title: Present CarNotea in README and public landing page
status: done
priority: high
size: L # One cohesive product-presentation PR; assets, README, and landing share one source of truth.
spec_version: 1
owner: codex
dependencies: []
labels: [web, docs, ux, presentation]
created_at: 2026-08-26
updated_at: 2026-08-27
closed_at: 2026-08-27
---

# T-109 — Present CarNotea in README and public landing page

## Goal

Make a first-time visitor understand CarNotea, see real product evidence, and create or sign in to an account from the public homepage.

## Context

CarNotea is a deployed private vehicle-diary PWA at `https://carnotea.sergiusz.dev`, but its README is developer-first and `/` currently sends anonymous visitors to login. Existing deterministic dev data already demonstrates petrol and EV workflows. The owner approved one cohesive product-presentation change: real dark-mode screenshots, product-first README, and a public landing page that preserves the existing dashboard at `/` for authenticated users.

ADR-0005 assumed no marketing landing page. This ticket adds a superseding ADR while keeping the Vite SPA deployment model; it does not introduce SSR or a second frontend.

## Contract

### Endpoints / routes

| Method | Path                 | Auth             | Success                                                    | Errors                                                      |
| ------ | -------------------- | ---------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| GET    | `/`                  | optional session | anonymous: public landing; session: redirects to dashboard | session failure: public landing with sign-in path available |
| GET    | `/login?mode=signIn` | optional session | sign-in mode                                               | authenticated users redirect to `/dashboard`                |
| GET    | `/login?mode=signUp` | optional session | sign-up mode                                               | authenticated users redirect to `/dashboard`                |

### Request / response shapes

No API, database, shared Zod, or environment-variable contract changes. `mode` is validated in the web route with a local Zod schema.

### Provides

- Public, bilingual product landing at `/` for anonymous visitors.
- Direct sign-in/sign-up deep links from landing CTA buttons.
- Reproducible dark-mode product screenshots and social-preview image.
- Product-first README and an accurate compact architecture diagram.

### Consumes

- Existing `sessionQueryOptions` and authenticated dashboard route/component.
- Existing `authClient` email registration and sign-in implementation.
- Existing development seed domain data for petrol and electric vehicles.

## Acceptance criteria

- [x] An anonymous visitor to `/` sees a bilingual, responsive landing page explaining CarNotea, its core features, ICE/EV support, and account CTAs.
- [x] An authenticated visitor to `/` still reaches the existing dashboard without a landing-page flash.
- [x] Landing CTAs open sign-in and sign-up modes directly; the `mode` query input is Zod-validated.
- [x] The landing works in dark and light mode, remains usable at 390 px wide, and honours reduced motion.
- [x] Committed, real dark-mode screenshots show dashboard, activity, analytics, reminders, and both petrol and electric examples; generation is documented and repeatable.
- [x] README becomes product-first, includes live preview, screenshots, features, supported vehicle workflows, architecture, stack, and concise setup links.
- [x] The deployed static shell includes accurate title, description, canonical URL, Open Graph, Twitter, and social-preview metadata for `carnotea.sergiusz.dev`.
- [x] A new ADR records the public landing decision without changing the Vite SPA deployment model.
- [x] Relevant unit, E2E, format, lint, typecheck, build, and ticket validation pass; visible paths are verified locally in a real browser.

## Test matrix

| Case                    | Input                       | Expected                                                  |
| ----------------------- | --------------------------- | --------------------------------------------------------- |
| Anonymous root          | no session at `/`           | landing hero and account CTAs render                      |
| Authenticated root      | valid session at `/`        | existing dashboard renders; landing is absent             |
| Session request failure | failed session query at `/` | public landing offers login instead of a broken app shell |
| Sign-up CTA             | click account CTA           | `/login?mode=signUp` renders sign-up form                 |
| Sign-in CTA             | click login CTA             | `/login?mode=signIn` renders sign-in form                 |
| Invalid mode            | `?mode=unexpected`          | validated fallback sign-in mode                           |
| Locale parity           | PL and EN                   | every new key exists in both locales                      |
| Responsive motion       | 390 px / reduced motion     | no horizontal scroll; decorative animation disabled       |
| Screenshot workflow     | seeded showcase data        | stable named dark-mode assets are generated               |

## Files to touch

- `README.md`, `docs/architecture.md`, `docs/getting-started.md`, `docs/media/`
- `docs/adr/0016-*.md`, `docs/adr/README.md`
- `apps/web/index.html`, `apps/web/public/`, `apps/web/scripts/`, `apps/web/e2e/`
- `apps/web/src/routes/`, `apps/web/src/features/auth/`, `apps/web/src/features/landing/`
- `apps/web/src/locales/pl/`, `apps/web/src/locales/en/`, `apps/web/src/i18n/`
- `apps/web/src/lib/router.ts`, relevant tests
- `tickets/T-109-product-presentation-and-landing.md`, `tickets/INDEX.md`

## Out of scope

- SSR, Next.js, a separate marketing application, or SEO for authenticated routes.
- Public read-only demo accounts or production data screenshots.
- Changes to registration policy, API contracts, database schema, or deployment.
- Push, deploy, or PR creation.

## Implementation notes

- Size L is intentionally not split: the landing, README, capture flow, and assets must tell one consistent story and be reviewable as one product-presentation change.
- The canonical screenshots use English UI for README and dark mode. Landing copy remains fully localized.
- The landing must make no API requests other than optional session resolution; it must remain useful if API session resolution fails.

## Verification

- `pnpm --filter @carnotea/web run test -- src/App.test.tsx` → pass (2 tests)
- `pnpm --filter @carnotea/web test:e2e -- e2e/landing.spec.ts` → pass (2 tests)
- `pnpm --filter @carnotea/web test:e2e` → pass (critical path)
- `pnpm --filter @carnotea/web lint`, `typecheck`, and `build` → pass
- `pnpm format:check`, `pnpm lint:tickets`, `pnpm tickets:index --check`, and `git diff --check` → pass
- local desktop/mobile Playwright walkthrough in dark and light modes → visible landing paths verified

## Notes

- Playwright was pinned to `127.0.0.1:5173` for local tests. `localhost:5173` resolved to an unrelated local application in this environment.
- The existing critical E2E flow was refreshed to wait for sign-up completion and use the current accessible controls. It now verifies registration, vehicle creation, fuel-log creation, and the authenticated dashboard route.
- The presentation audit added distinct dashboard, activity, analytics, and reminders captures, a dedicated 1200 × 630 social image, and mobile regression coverage for language access, horizontal overflow, lightbox behaviour, and the sign-up deep link.

## References

- ADR: [ADR-0005](../docs/adr/0005-vite-react-no-nextjs.md), [ADR-0006](../docs/adr/0006-pwa-from-day-one.md), [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Reference: `https://github.com/sergiusz-x/disc-golf-tracker`
