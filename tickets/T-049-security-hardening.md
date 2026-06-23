---
id: T-049
title: API + web security hardening for production
status: done
priority: high
owner: codex
dependencies: [T-004]
labels: [security]
created_at: 2026-06-15
updated_at: 2026-06-23
closed_at: 2026-06-23
---

# T-049 — API + web security hardening for production

## Goal

Harden the deployed API and web app: security headers, rate limiting, a strict
production CORS allow-list, body-size limits, hardened auth cookies, and a
dependency audit gate in CI.

## Context

The API skeleton (T-004) is built for local dev with permissive defaults. Before
exposing it on the public internet behind the prod proxy (T-045) we need the
standard hardening layer so the service isn't trivially abusable. CORS must also
stay compatible with the OpenTelemetry propagation from T-018, which sends a
`traceparent` request header cross-origin — a too-strict allow-list silently
breaks tracing.

## Acceptance criteria

- [x] Security response headers are applied (Fastify `@fastify/helmet` or
      equivalent): HSTS, `X-Content-Type-Options`, frame options, a sensible
      referrer policy, and a Content-Security-Policy appropriate for the app.
- [x] Rate limiting is enabled on the API (e.g. `@fastify/rate-limit`) with
      sane global limits and tighter limits on auth endpoints; limits are
      configurable via env.
- [x] Production CORS is a **strict allow-list** of known origins (the web app
      origin), with credentials handling correct, and it **explicitly allows the
      `traceparent` (and `tracestate`) request headers** so T-018 propagation
      keeps working cross-origin.
- [x] A request **body-size limit** is enforced so oversized payloads are
      rejected rather than buffered.
- [x] better-auth session cookies are hardened in production: `Secure`,
      `HttpOnly`, an appropriate `SameSite`, and correct domain/path scoping.
- [x] `pnpm audit` (production deps, suitable severity threshold) runs in CI and
      fails the job on findings above the threshold, with a documented way to
      waive an accepted advisory.
- [x] Hardening is environment-aware: strict in production, relaxed enough for
      local dev (e.g. localhost CORS) without code edits — driven by env.

## Files to touch

- `apps/api/src/main.ts` / a security/bootstrap module (helmet, rate-limit,
  body limit, CORS)
- `apps/api/src/config/env.ts` (CORS origins, rate-limit knobs)
- `apps/api/` auth/cookie config (better-auth production cookie options)
- `.github/workflows/` (`pnpm audit` step, building on T-015)
- `pnpm-workspace.yaml` (catalog entries for the Fastify security plugins)
- `.env.example` (CORS origin + rate-limit vars, commented)
- `apps/api/AGENTS.md`, `docs/architecture.md` (note the hardening posture)

## Out of scope

- Secret storage/rotation (T-048) and TLS termination (handled by the proxy in
  T-045).
- WAF, DDoS protection, or fail2ban at the host/proxy layer.
- Penetration testing / a formal security review engagement.
- Authentication/authorization business logic — this is transport/edge
  hardening, not the auth model (T-006).

## Implementation notes

- Use the Fastify-native plugins (`@fastify/helmet`, `@fastify/rate-limit`,
  `@fastify/cors`) since the API is Nest-on-Fastify; verify latest stable
  versions via `pnpm info` before pinning.
- The CORS allow-list is the easiest thing to get subtly wrong: it must include
  `traceparent`/`tracestate` in `allowedHeaders` or T-018 cross-origin tracing
  breaks with no obvious error. Call this out in the PR.
- Drive allowed origins from env (the web app URL) so dev and prod differ by
  config only.
- For `pnpm audit`, pick a severity threshold (e.g. `--audit-level=high`) and
  document the waiver path so a noisy transitive advisory can't block deploys
  indefinitely.

## References

- Related tickets: T-004 (api skeleton), T-006 (better-auth),
  T-018 (OTel — `traceparent` CORS header), T-045 (prod proxy/TLS),
  T-048 (secrets), T-015 (CI)
- ADR: [ADR-0004](../docs/adr/0004-better-auth.md)
- External: Fastify ecosystem — <https://fastify.dev/ecosystem/>
