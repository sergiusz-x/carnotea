---
id: T-048
title: Production secrets handling for the deployed stack
status: done
priority: medium
owner: ~
dependencies: [T-045]
labels: [ops, security]
created_at: 2026-06-15
updated_at: 2026-07-05
closed_at: 2026-07-05
---

# T-048 — Production secrets handling for the deployed stack

## Goal

Define and implement how production secrets (DB password, `BETTER_AUTH_SECRET`,
registry/storage credentials) reach the running containers — injected at
runtime, never baked into an image or committed — with rotation documented.

## Context

T-045 makes the stack deployable and intentionally defers secrets to env, and
T-046/T-047 introduce more credentials (registry token, SSH key, backup storage
keys). Without a deliberate policy these leak into images, compose files, or
git. This ticket establishes the single contract for where prod secrets live and
how they're injected, keeping `.env.example` as the only committed template.

**Hosting-model update (2026-07-05):** this ticket was originally written
around a bare VPS + SSH + `docker-compose.prod.yml` + on-disk `.env.prod`
release model. The project has since moved to a self-hosted **Dokploy**
instance (see `docs/agents/lessons.md`, 2026-07-04 entries, and T-085, which
removed the SSH/GHCR deploy workflow for the same reason). Dokploy runs
`docker-compose.prod.yml` as a "Docker Compose" application and provides its
own per-application **Environment Variables** UI, storing values in its own
database and injecting them at deploy time — this replaces the planned
`.env.prod` file / Docker Compose `secrets:` block as the canonical injection
mechanism. The acceptance criteria and files below are updated for this model;
the underlying goal (no secret in git/images, fail-fast validation, documented
rotation) is unchanged.

## Acceptance criteria

- [x] No secret value is present in any committed file, any Docker image layer,
      or any built `dist/` bundle — `docker-compose.prod.yml` only ever
      references `${VAR:?error}` placeholders, `.env.example` holds only
      placeholder values, and `.gitignore` blocks every real `.env*` file.
- [x] Secrets are injected at runtime via **Dokploy's per-application
      Environment Variables UI** (stored in Dokploy's own database, injected
      when Dokploy runs `docker compose` for the stack) — documented as the
      canonical mechanism in `docs/deployment.md` § Secrets management.
- [x] `.env.example` lists every required prod variable name with a placeholder
      and a comment, and remains the **only** committed env template.
- [x] The API's Zod env schema fails fast at boot if a required secret is missing
      in production (no default for `DATABASE_URL`/`BETTER_AUTH_SECRET`/
      `BETTER_AUTH_URL` in any env), and additionally rejects the known
      `.env.example` placeholder values when `NODE_ENV=production`.
- [x] A rotation procedure is documented for each secret class (auth secret, DB
      password, SMTP credentials, backup storage keys): how to rotate and the
      redeploy needed to pick up the new value.
- [x] Web build-time `VITE_*` values are confirmed non-secret (they ship in the
      bundle) — any genuine secret stays server-side only.

## Files to touch

- `.env.example` (complete, commented prod variable list; points at Dokploy's
  Environment Variables UI instead of an on-disk prod file)
- `docker-compose.prod.yml` (header comment only — variables already flow
  through `${VAR:?error}` interpolation, which Dokploy fills in; no
  `env_file:`/`secrets:` block needed)
- `apps/api/src/config/env.ts` (required-in-prod validation +
  placeholder-rejection guard)
- `docs/deployment.md` (new § Secrets management: injection model + rotation
  runbook)
- `.gitignore` (ensure `.env*` except `.env.example` is ignored)

## Out of scope

- Standing up a dedicated secrets manager (Vault, SOPS, cloud KMS) — Dokploy's
  env storage is sufficient for a single self-hosted instance; revisit via ADR
  if needs grow.
- Automated/scheduled secret rotation — rotation is documented and manual here.
- CI-side secret config beyond consuming GitHub Actions secrets (set up in
  T-046).
- Application authz/session behavior — that's T-049, referenced not duplicated.
- Rewriting the rest of `docs/deployment.md` (release model, prerequisites,
  GHCR/SSH sections) for Dokploy — flagged with a banner note, tracked as a
  separate follow-up ticket.

## Implementation notes

- Model: Dokploy's per-application **Environment Variables** UI is the single
  source of truth for prod secret values; `docker-compose.prod.yml`'s existing
  `${VAR:?error}` interpolation already consumes whatever Dokploy injects, so
  no compose file restructuring was needed.
- The env Zod schema (`apps/api/src/config/env.ts`) is the enforcement point:
  `DATABASE_URL`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` have no default in any
  environment, and a `superRefine` rejects the exact `.env.example` placeholder
  values (`replace-me-with-openssl-rand-base64-32`, `carnotea_dev_password`)
  whenever `NODE_ENV=production` — see `apps/api/src/config/env.test.ts`.
- `VITE_*` values are compiled into the static bundle — confirmed the only one
  in use (`VITE_OTEL_EXPORTER_OTLP_ENDPOINT`) is a public URL, not a secret.
- T-046's deploy and T-047's backup credentials should follow this same
  Dokploy-env-var injection contract rather than inventing their own when
  those tickets are picked up.

## References

- Related tickets: T-045 (prod compose), T-046 (CD credentials),
  T-047 (backup storage credentials), T-049 (app hardening)
- ADR: [ADR-0004](../docs/adr/0004-better-auth.md) (`BETTER_AUTH_SECRET`)
- External: Docker Compose secrets —
  <https://docs.docker.com/compose/how-tos/use-secrets/>
