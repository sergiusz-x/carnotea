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
3. `POST /vehicles/{id}/fuel-logs` is called via the typed client.
4. The API authenticates the request through better-auth, runs the Zod parser,
   and calls the `add_fuel_log(...)` stored procedure (or the equivalent
   Drizzle-built insert) - whichever the corresponding ticket decides.
5. The database trigger `trg_fuel_logs_sync_mileage_reading` writes a derived
   row into `mileage_readings`; another trigger keeps the matching `expenses`
   row in sync.
6. The response is the saved fuel log; TanStack Query invalidates
   `["vehicles", id, "fuel-logs"]` and `["vehicles", id, "summary"]`.

### Resolving an issue with a service

1. The web app calls `POST /issues/{id}/resolve-with-service` with the service
   payload.
2. The API forwards to the `resolve_issue_with_service(...)` procedure in a
   single transaction.
3. The trigger network synchronises mileage readings, expenses, and the issue
   status atomically.

The point of these examples is that **the database does a lot of the work**.
Application code should not try to recreate logic that already exists as a
trigger or procedure.

## Deployment

Production runs on a VPS via `docker compose`. The compose file orchestrates:

- `postgres` (the existing image, persisted volume),
- `api` (built `apps/api` image),
- `web` (a static container or served by the API).

The development compose file (`docker-compose.yml` in the repo root) currently
only starts Postgres. The production compose lives separately - that ticket
comes later.

## What's not in scope (yet)

- Background workers / queues.
- File / image storage (receipt photos, vehicle pictures).
- Sharing vehicles between users / families.
- Push notifications for reminders.
- Mobile-native features (camera-based VIN scan, GPS station lookup).

Every item in this list will become a ticket once we are ready for it. Until
then, do not write speculative code for them.
