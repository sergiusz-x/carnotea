# ADR-0004: better-auth for authentication

- **Status**: accepted
- **Date**: 2026-06-13
- **Deciders**: Sergiusz, Claude

## Context

The schema has a `users` table that models the *domain* user (name, email,
created_at). It has no fields for hashed passwords, sessions, email
verification, or OAuth identities. We need that machinery before any user can
log in.

We don't want to build it ourselves - password hashing, session rotation,
account linking, and verification flows are well-trodden territory where the
boring choice is the safe choice.

Constraints:

- TypeScript-first (works with NestJS),
- supports email/password initially, OAuth later,
- can target an existing Postgres database via Drizzle,
- not coupled to a specific frontend framework.

## Decision

We use **better-auth** as the authentication layer. It owns its own set of
tables (user, account, session, verification) inside our Postgres database. Our
domain `vehicle_diary.users` table acts as a profile linked one-to-one to the
better-auth user via id.

The exact table placement (whether better-auth tables live in `vehicle_diary`
schema, or in a separate `auth` schema, or at `public`) is finalised in
ticket **T-006**, alongside the question of whether `vehicle_diary.users.id`
equals the auth user id or carries a foreign key to it.

The API integrates better-auth as middleware on its HTTP server. The web app
uses better-auth's client to call sign-in / sign-up / sign-out endpoints. On
the server, request handlers read the authenticated user from the session
context.

## Consequences

### Positive

- We avoid implementing password hashing, session management, CSRF, and OAuth
  flows from scratch.
- better-auth's TypeScript-first design fits the stack.
- Email/password works on day one; adding Google / GitHub OAuth later is a
  config change rather than a rewrite.

### Negative

- We adopt a dependency that touches the database directly. Schema upgrades
  must be coordinated with better-auth releases.
- Linking better-auth user to our domain `users` row adds one indirection.
  This is mostly a one-time mapping concern (T-006).

### Neutral

- The choice doesn't preclude adding 2FA, magic links, or passkeys later;
  better-auth supports them.

## Alternatives considered

### Option A: Roll our own (Argon2 + JWT + sessions table)

Rejected. Security-critical code we'd have to audit ourselves. Not worth it for
a personal project.

### Option B: Clerk / Auth0

Rejected. External SaaS with monthly cost and vendor lock-in. Overkill for the
target audience and the self-hosted VPS deployment.

### Option C: Lucia

Rejected as of 2026: the library has shifted toward being a learning resource
rather than a production library. better-auth has clearer momentum and a wider
feature set.

### Option D: Supabase Auth

Rejected. Forces the whole stack toward Supabase, which is not our deployment
target.
