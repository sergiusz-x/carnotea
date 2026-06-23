---
id: T-045
title: Production container images + docker compose with TLS reverse proxy
status: done
priority: high
owner: codex
dependencies: [T-004, T-007]
labels: [ops, infra]
created_at: 2026-06-15
updated_at: 2026-06-23
closed_at: 2026-06-23
---

# T-045 — Production container images + docker compose with TLS reverse proxy

## Goal

Ship production-grade container images for `apps/api` and `apps/web` and a
`docker-compose.prod.yml` that runs api + static web + Postgres behind a reverse
proxy with automatic HTTPS — the deployable unit for the VPS.

## Context

The README targets "VPS + docker compose" for production, but only a dev-only
Postgres compose file exists (T-014). To deploy at all we need real, minimal,
non-root images and a production compose stack that terminates TLS and routes
the web app and `/api` to the right service. This is the foundation every
later ops ticket (CD, backups, secrets) builds on.

## Acceptance criteria

- [x] `apps/api/Dockerfile`: multi-stage build that installs with pnpm, builds
      to `dist/`, then produces a slim runtime image using `pnpm deploy --prod`
      (pruned, production-only deps), running as a **non-root** user, exposing
      the API port and consuming `DATABASE_URL` at runtime.
- [x] `apps/web/Dockerfile`: multi-stage build producing the Vite static bundle,
      served by a small static server (the reverse proxy or an nginx/caddy
      stage), as a non-root image; build-time `VITE_*` values are baked at build.
- [x] A `.dockerignore` per app keeps `node_modules`, tests, and source out of
      the runtime image; images are reasonably small (record sizes in the PR).
- [x] `docker-compose.prod.yml` defines four services: `api`, `web` (or web
      served by the proxy), `postgres` (16, named volume, healthcheck), and a
      reverse proxy.
- [x] The reverse proxy (e.g. **Caddy**) obtains/renews TLS certificates
      automatically and routes `https://<domain>/` → web and
      `https://<domain>/api/*` → api.
- [x] `api` depends on `postgres` healthcheck; `restart: unless-stopped` on
      long-running services; no host ports exposed except the proxy's 80/443.
- [x] All secrets/config come from env (no values hard-coded in the compose
      file); a documented `.env.prod`-style contract exists, with
      `.env.example` remaining the only committed template.
- [x] `docs/getting-started.md` (or a new `docs/deployment.md`) documents
      bringing the stack up on a fresh VPS.

## Files to touch

- `apps/api/Dockerfile`, `apps/api/.dockerignore` (new)
- `apps/web/Dockerfile`, `apps/web/.dockerignore` (new)
- `docker-compose.prod.yml` (new)
- `Caddyfile` (or proxy config) (new)
- `docs/deployment.md` (new) and/or `docs/getting-started.md`
- `.env.example` (document prod-relevant vars, commented)

## Out of scope

- CI/CD that builds, publishes, and rolls out these images (T-046).
- Running `drizzle-kit migrate` as a release step (T-046).
- Backup/restore (T-047) and full secrets-store integration (T-048).
- Security hardening of the app itself — headers, rate limiting, CORS (T-049).
- Multi-host/orchestrated deploys (k8s, swarm) — single VPS only.

## Implementation notes

- Use `pnpm deploy --filter @carnotea/api --prod <out>` from a pruned
  workspace to get a self-contained runtime tree; avoids shipping the whole
  monorepo. Verify the exact flags against the installed pnpm version.
- Pin a Node LTS base (e.g. `node:<lts>-slim`) and a digest where practical;
  drop to a non-root `USER` before `CMD`.
- The API is Fastify-on-Nest compiled with SWC — the runtime entry is the built
  `dist/` output plus the OTel `--import` preload from T-018 if present.
- Caddy gives automatic Let's Encrypt TLS with almost no config; an `nginx` +
  `acme` combo is an acceptable alternative — record the choice in an ADR if it
  diverges from this ticket.
- Keep `web` build-time env minimal; runtime config that must change per deploy
  belongs to the API, not the static bundle.

## References

- Related tickets: T-004 (api skeleton), T-007 (web skeleton),
  T-014 (dev compose — do not duplicate), T-046 (CD + migrate),
  T-047 (backups), T-048 (secrets), T-049 (hardening)
- External: Caddy — <https://caddyserver.com/docs/>; pnpm deploy —
  <https://pnpm.io/cli/deploy>
