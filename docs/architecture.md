# Architecture

This document describes the shape of CarNotea: what each part is, how they
connect, and which boundaries are load-bearing. It is intentionally high-level.
Detailed decisions live in [`adr/`](./adr/).

## Product in one sentence

A single user logs in, registers their cars, and records what happens to them
(refuels, charges, services, parts, issues, expenses, reminders). The data is
private to that user. Everything is browsable on any device, installable as a
PWA on phones, and works as a normal web app on desktops.

## Component diagram

```
                ┌──────────────────────────────┐
                │   apps/web   (Vite + React)  │
                │  - PWA (manifest, SW)        │
                │  - TanStack Router / Query   │
                │  - shadcn/ui + Tailwind      │
                │  - i18n (pl, en)             │
                └───────────────┬──────────────┘
                                │   HTTPS / JSON (REST)
                                │   OpenAPI contract (Zod-derived)
                                ▼
                ┌──────────────────────────────┐
                │   apps/api   (NestJS)        │
                │  - REST controllers          │
                │  - Zod validation            │
                │  - better-auth integration   │
                │  - Drizzle query builder     │
                └───────────────┬──────────────┘
                                │   SQL
                                ▼
                ┌──────────────────────────────┐
                │  PostgreSQL 16               │
                │  schema: vehicle_diary       │
                │  + better-auth tables        │
                │  + triggers/functions/views  │
                └──────────────────────────────┘
```

Shared types and Zod schemas live in `packages/shared` and are imported by both
the API and the web app, so a single source of truth defines request and
response shapes.

## Boundaries that matter

### 1. Drizzle TypeScript is the source of truth for the database

The schema is defined in `packages/db/src/schema/` using Drizzle's TypeScript
DSL. `drizzle-kit generate` derives versioned SQL migration files from it;
`drizzle-kit migrate` applies them. Application code imports the schema and uses
Drizzle's query builder with full TypeScript types.

A small number of DB-level constraints that cannot be safely enforced at the
application boundary (energy-source check, resolved-date invariant) are kept as
raw SQL in a dedicated migration file. All other business logic — expense syncing,
mileage syncing, analytics calculations — lives in NestJS service methods.

See [ADR-0002](./adr/0002-drizzle-schema-as-code.md) for the full reasoning.

### 2. The contract between API and web is OpenAPI, derived from Zod

Each REST endpoint declares its input and output as Zod schemas. Those schemas
are converted into an OpenAPI document, which is published at `/docs` on the API
and used to generate a typed client for the web app. The Zod schemas themselves
also live in `packages/shared`, so types stay in sync even before the client is
regenerated.

See [ADR-0003](./adr/0003-rest-openapi-zod.md).

### 3. Auth lives in better-auth, not in our code

better-auth owns its own tables (`auth_user`, `auth_session`, `auth_account`,
`auth_verification`) for sessions, accounts, verifications, and the auth-level
user. Our domain `users` table acts as a profile.

**Linkage (decided in T-006):** the domain `users.id` IS the better-auth user id
— better-auth is configured to generate UUIDs and a post-signup hook creates the
matching `users` profile row with the same id. So the authenticated user id from
a session is also the ownership key for `vehicles` and every child entity, with
no indirection.

The API mounts better-auth's handler at `/api/auth/*`; an `AuthGuard` exposes a
typed `request.user` to controllers and returns 401 when unauthenticated. The web
client talks to better-auth's endpoints for sign-in / sign-up / sign-out.

See [ADR-0004](./adr/0004-better-auth.md).

### 4. The PWA is shipped from day one, but only the installable layer

The web app ships a manifest and a minimal service worker so users can install it
on a phone. Offline-first behaviour, background sync, and push notifications are
explicitly out of scope for the first iteration and will be added under their own
tickets.

See [ADR-0006](./adr/0006-pwa-from-day-one.md).

### 5. The app is bilingual from the first screen

UI strings are externalised behind an i18n layer (likely `i18next` with
`react-i18next`) and shipped with Polish and English translations. The default
language is detected from the browser; the choice is persisted per user.

See [ADR-0007](./adr/0007-i18n-pl-en.md).

## Data flow examples

### Logging a refuel

1. User opens the "Add refuel" form on the web app.
2. `react-hook-form` validates with the same Zod schema the API uses.
3. `POST /api/vehicles/{id}/fuel-logs` is called via the typed client.
4. The API authenticates through better-auth (`AuthGuard` → `request.user`),
   runs the Zod parser, asserts the vehicle is owned, and inserts the fuel log
   with a Drizzle query (`totalCost` is computed server-side, never trusted from
   the body).
5. The same service then projects the entry into the derived tables **in
   application code**: `MileageSyncService` upserts a `mileage_readings` row
   (`sourceType = 'fuel_log'`) and recomputes `vehicles.currentMileage`, and
   `CostSyncService` upserts the matching `expenses` row. These run through
   explicit service seams, not DB triggers. (Making the insert + the derived
   writes one transaction is tracked in T-061.)
6. The response is the saved fuel log; TanStack Query invalidates
   `["vehicles", id, "fuel-logs"]` and the vehicle's mileage/expense queries.

### Keeping the cost ledger in sync

1. Every cost-bearing entry (fuel log, charging session, service record) calls
   `CostSyncService` on create/update/delete.
2. The helper upserts/deletes one `expenses` row keyed by `(sourceType, sourceId)`
   (a partial unique index), so the `expenses` table is the single normalized
   source of truth for spend — analytics (T-028) read it instead of re-summing
   four source tables.

The DB still enforces the **invariants** it owns as constraints and a few
validation triggers (e.g. `enforce_vehicle_energy_source`,
`enforce_issue_resolved_date`, `totalCost = round(...)` checks). But the
**business logic** — mileage sync, cost sync, analytics — lives in NestJS service
methods, per [ADR-0002](./adr/0002-drizzle-schema-as-code.md). There are no
`add_fuel_log` / `resolve_issue_with_service` stored procedures or sync triggers;
the legacy `sql/` design that used them was superseded by schema-as-code in T-002.

## Deployment

Production runs on a self-hosted Dokploy instance. The Dokploy setup
orchestrates two independent units:

1. **CarNotea Compose** (`docker-compose.prod.yml`) — runs `migrate` (one-shot
   Drizzle migration runner), `api` (NestJS/Fastify), and `web` (Nginx SPA
   server).
2. **PostgreSQL 16 Database service** (Dokploy: Create Service → Database →
   PostgreSQL 16) — a separate lifecycle unit that the compose stack connects
   to via `DATABASE_URL`. Backups to Cloudflare R2 are configured from the
   Dokploy UI; no backup credentials are stored in this repo.

See [ADR-0015](./adr/0015-dokploy-managed-postgres.md) for the rationale for
keeping Postgres outside the compose stack.

The development compose file (`docker-compose.yml` in the repo root) still
runs a local Postgres container for development use only.

## Security hardening

The API applies a layered security posture driven by environment variables, so
dev and prod differ by config only:

- **HTTP security headers** — `@fastify/helmet` sets HSTS (1 year for prod),
  `X-Content-Type-Options: nosniff`, frame-ancestors, a strict referrer policy,
  and a CSP appropriate for the app. All headers are applied in
  `apps/api/src/main.ts`.
- **CORS** — `@fastify/cors` is configured with an environment-controlled
  allow-list (`CORS_ORIGINS`). In development it's relaxed for localhost; in
  production only the known web-app origin is allowed. The list explicitly
  permits the `traceparent` and `tracestate` headers so OpenTelemetry
  propagation (T-018) works cross-origin.
- **Rate limiting** — `@fastify/rate-limit` enforces a global cap
  (`RATE_LIMIT_MAX`, default 100) per IP per window, with a stricter limit on
  auth endpoints (`RATE_LIMIT_AUTH_MAX`, default 10). The window is configurable
  via `RATE_LIMIT_WINDOW_MS` (default 60 s).
- **Body-size limit** — Oversized request payloads are rejected early via
  Fastify's `bodyLimit` option (default 1 MB, configurable via `BODY_LIMIT`).
- **Hardened auth cookies** — better-auth session cookies use `Secure`,
  `HttpOnly`, and `SameSite=Lax` in production, scoped to the API path.
- **Dependency audit** — `pnpm audit --prod --audit-level=high` runs in CI as
  a required gate (see `.github/workflows/ci.yml`). Accepted advisories must be
  waived by a documented follow-up ticket or dependency override, not ignored in
  the workflow.

Refer to `apps/api/src/main.ts`, `apps/api/src/auth/auth.ts`,
`apps/api/src/config/env.ts`, and `.env.example` for the exact defaults.

## What's not in scope (yet)

- Background workers / queues.
- File / image storage (receipt photos, vehicle pictures).
- Sharing vehicles between users / families.
- Push notifications for reminders.
- Mobile-native features (camera-based VIN scan, GPS station lookup).

Every item in this list will become a ticket once we are ready for it. Until
then, do not write speculative code for them.
