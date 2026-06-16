---
id: T-048
title: Production secrets handling for the deployed stack
status: ready
priority: medium
owner: ~
dependencies: [T-045]
labels: [ops, security]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
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

## Acceptance criteria

- [ ] No secret value is present in any committed file, any Docker image layer,
      or any built `dist/` bundle; verified (e.g. image history / `git` history
      review) and noted in the PR.
- [ ] Secrets are injected at runtime via the deploy environment — an untracked
      `.env.prod` on the VPS and/or Docker/compose secrets and/or the CI secret
      store — and the chosen mechanism is documented as the canonical one.
- [ ] `.env.example` lists every required prod variable name with a placeholder
      and a comment, and remains the **only** committed env template.
- [ ] The API's Zod env schema fails fast at boot if a required secret is missing
      in production (no silent insecure default for `BETTER_AUTH_SECRET` etc.).
- [ ] A rotation procedure is documented for each secret class (auth secret, DB
      password, registry/storage credentials): how to rotate and the restart
      needed to pick up the new value.
- [ ] Web build-time `VITE_*` values are confirmed non-secret (they ship in the
      bundle) — any genuine secret stays server-side only.

## Files to touch

- `.env.example` (complete, commented prod variable list)
- `docker-compose.prod.yml` (env_file / `secrets:` wiring, no inline values)
- `apps/api/src/config/env.ts` (required-in-prod validation)
- `docs/deployment.md` (secrets + rotation runbook)
- `.gitignore` (ensure `.env*` except `.env.example` is ignored)

## Out of scope

- Standing up a dedicated secrets manager (Vault, SOPS, cloud KMS) — env / file
  injection is sufficient for a single VPS; revisit via ADR if needs grow.
- Automated/scheduled secret rotation — rotation is documented and manual here.
- CI-side secret config beyond consuming GitHub Actions secrets (set up in
  T-046).
- Application authz/session behavior — that's T-049, referenced not duplicated.

## Implementation notes

- Simplest viable model for one VPS: an untracked `.env.prod` referenced by
  `env_file:` in `docker-compose.prod.yml`, with file perms locked down; layer
  Docker/compose `secrets:` for the most sensitive values if warranted.
- The env Zod schema is the enforcement point: make secret vars required when
  `NODE_ENV==production` so a missing/placeholder value is a boot error, not a
  runtime surprise.
- Remember `VITE_*` values are compiled into the static bundle — never put a
  secret behind a `VITE_` name.
- Cross-check that T-046's deploy and T-047's backup credentials follow this
  same injection contract instead of inventing their own.

## References

- Related tickets: T-045 (prod compose), T-046 (CD credentials),
  T-047 (backup storage credentials), T-049 (app hardening)
- ADR: [ADR-0004](../docs/adr/0004-better-auth.md) (`BETTER_AUTH_SECRET`)
- External: Docker Compose secrets —
  <https://docs.docker.com/compose/how-tos/use-secrets/>
