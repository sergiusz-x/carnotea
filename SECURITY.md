# Security Policy

CarNotea is a personal vehicle-diary application that stores user data
(vehicles, mileage, expenses, and account credentials via better-auth). We take
security seriously even at this early stage.

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Instead, email **contact@sergiusz.dev** with:

- a description of the vulnerability,
- steps to reproduce (a proof of concept if you have one),
- the affected area (API, web, database, auth),
- any suggested remediation.

You'll get an acknowledgement as soon as possible. Once the issue is confirmed
and fixed, we're happy to credit you (unless you prefer to stay anonymous).

## Scope

In scope:

- The API (`apps/api`) — authentication, authorization, input validation,
  injection, data exposure across users.
- The web app (`apps/web`) — XSS, CSRF, exposure of secrets in the bundle.
- The database layer (`packages/db`) — SQL injection, tenant/user data leakage.
- Dependency vulnerabilities with a realistic exploit path.

Out of scope (for now):

- Denial of service from unrealistic traffic volumes.
- Issues requiring a compromised developer machine or physical access.
- Best-practice suggestions without a concrete exploit (open a normal issue or
  a ticket for those).

## Handling principles

These are also encoded as rules in [`AGENTS.md`](./AGENTS.md) and
[`docs/conventions.md`](./docs/conventions.md):

- All external input is validated with Zod at the boundary.
- Passwords and sessions are handled by better-auth — we never roll our own.
- Auth errors return minimal information (no "this email exists" oracles).
- Secrets live in `.env` (gitignored), never in committed code or logs.
- Cross-user data access is prevented at the query layer, not just the UI.
