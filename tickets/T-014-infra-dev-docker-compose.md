---
id: T-014
title: Infra — dev docker-compose for full stack
status: ready
priority: low
owner: ~
dependencies: [T-004, T-007]
labels: [infra, docker]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-014 — Infra: dev docker-compose for full stack

## Goal

Extend the existing `docker-compose.yml` so a single `docker compose up`
brings up Postgres, the API, and the web app, all wired together and ready to
develop against.

## Context

Right now `docker-compose.yml` only starts Postgres. Once the API (T-004) and
the web app (T-007) exist, an agent or human should be able to clone the repo,
run one command, and reach the app in a browser.

## Acceptance criteria

- [ ] `docker compose up -d` from a fresh clone (with `.env` populated)
      starts: `postgres`, `api`, `web`.
- [ ] The `api` service builds from `apps/api/Dockerfile`. It waits for
      Postgres to be healthy before starting.
- [ ] The `web` service serves the production build from a static container
      (nginx or Caddy).
- [ ] Hot-reload during development is *not* a goal of this ticket — that's
      `pnpm dev`. Compose is for "does it run end to end".
- [ ] `docs/getting-started.md` documents the two flows clearly: "fast dev
      loop = `pnpm dev`", "end-to-end check = `docker compose up`".
- [ ] A production compose (`compose.prod.yml`) is not part of this ticket —
      explicitly out of scope.

## Files to touch

- `docker-compose.yml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `docs/getting-started.md`

## Out of scope

- Production deployment compose.
- TLS termination.
- Migration runner as a one-shot job (it's a `pnpm db:migrate` step today).

## Implementation notes

- Use multi-stage builds for both Dockerfiles to keep images small.
- Network: a single `carnotea_default` network is enough.
- For the web container, prefer Caddy 2 (simpler config) unless nginx is
  already familiar to the user.

## References

- ADR: [ADR-0005](../docs/adr/0005-vite-react-no-nextjs.md)
