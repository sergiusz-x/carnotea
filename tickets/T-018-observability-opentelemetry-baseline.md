---
id: T-018
title: Observability baseline — OpenTelemetry tracing across api + web
status: done
priority: medium
owner: codex
dependencies: [T-004, T-007]
labels: [observability, api, web]
created_at: 2026-06-15
updated_at: 2026-06-23
closed_at: 2026-06-23
---

# T-018 — Observability baseline: OpenTelemetry tracing across api + web

## Goal

Wire OpenTelemetry **tracing** into `apps/api` and `apps/web` as a minimal,
production-ready foundation so a single distributed trace flows browser → API →
database and is correlated with our pino logs — without running any telemetry
backend until an OTLP endpoint env var is set.

## Context

We want observability baked in from day one rather than retrofitted. A few
HTTP routes exist now (`/healthz`, `/readyz`, `/openapi.json`) and feature work
is about to land; instrumenting the seam now means every future endpoint and
every browser interaction is traced for free, and the trace context is already
threaded through logs.

This ticket is deliberately **mega-basic**: no collector, no Jaeger/Tempo/
Prometheus, no dashboards. It stands up the OpenTelemetry SDK on both sides,
turns on auto-instrumentation, propagates W3C `traceparent` across the
browser→API boundary, and correlates spans with the existing pino logs. The
exporter follows the **standard `OTEL_*` env-var contract**, so going to
production is "set `OTEL_EXPORTER_OTLP_ENDPOINT` and point it at a collector" —
no code change. With no endpoint configured the SDK is a no-op and the apps run
exactly as before.

## Acceptance criteria

### API (`apps/api`)

- [x] An OpenTelemetry Node SDK is initialised **before** the Nest application
      and any instrumented module is imported (instrumentation must patch
      modules first), e.g. via a `--import`/preloaded `instrumentation.ts`.
- [x] Auto-instrumentation is enabled for **HTTP**, **Fastify**, and the
      **postgres/pg** client used by `@carnotea/db`.
- [x] The tracer resource sets `service.name=carnotea-api` (overridable via the
      standard `OTEL_SERVICE_NAME`) and `service.version` / `deployment.environment`
      from existing env.
- [x] The span exporter is selected purely from standard `OTEL_*` env vars.
      When no `OTEL_EXPORTER_OTLP_ENDPOINT` is set the SDK starts with **no
      exporter** (or a console exporter only when `NODE_ENV!==production`) and
      the app boots and serves requests normally — **no backend required**.
- [x] pino log lines emitted during a request include the active `trace_id`
      and `span_id` (log↔trace correlation).
- [x] The SDK flushes and shuts down gracefully on app close / `SIGTERM`.
- [x] The new env vars are **optional** in the Zod env schema (absent → tracing
      disabled, not a boot error).

### Web (`apps/web`)

- [x] An OpenTelemetry Web SDK is initialised at app entry with `document-load`
      and `fetch`/XHR instrumentation.
- [x] W3C `traceparent` is propagated on `fetch` requests to the API origin
      (`/api` same-origin requests) so a trace started in the browser **continues into the
      API as one trace** (shared `trace_id`).
- [x] The web exporter is OTLP-HTTP configured via
      `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`. When unset, telemetry is a **no-op**
      and the app works normally (no console errors, no failed requests).

### Cross-cutting

- [x] Verifiable end-to-end: with console/OTLP exporting on, a browser `fetch`
      to an API route and the resulting API span share the same `trace_id`
      (capture in the PR notes; the API↔DB hop is covered by the pg span).
- [x] `.env.example` documents the new `OTEL_*` and `VITE_OTEL_*` variables with
      sane commented defaults (disabled).
- [x] `docs/adr/0013-opentelemetry-observability.md` records the decision to
      adopt OpenTelemetry (traces-first, default-off, standard env contract).
- [x] `docs/tech-stack.md`, `apps/api/AGENTS.md`, and `apps/web/AGENTS.md` are
      updated in the same PR.

## Files to touch

- `apps/api/src/instrumentation.ts` (new) + wiring in `main.ts` / the start script
- `apps/api/src/config/env.ts` (optional `OTEL_*` vars)
- `apps/api/` pino/logger config (trace context injection)
- `apps/web/src/otel.ts` (new) + import from `src/main.tsx`
- `apps/web/src/config` / env typing for `VITE_OTEL_*`
- `.env.example`
- `pnpm-workspace.yaml` (catalog entries for the OTel packages)
- `docs/adr/0013-opentelemetry-observability.md` (new)
- `docs/tech-stack.md`, `apps/api/AGENTS.md`, `apps/web/AGENTS.md`

## Out of scope

- **Metrics** and the **OTel logs signal** — keep pino as the log pipeline; add
  metrics in a follow-up ticket.
- Running any backend/collector (Jaeger, Tempo, Prometheus, Grafana, OTel
  Collector), dashboards, alerting, or SLOs.
- Custom manual spans for business logic — auto-instrumentation only for now.
- Sampling strategy beyond the default parent-based sampler.
- Infra/deploy wiring (Docker, k8s) — that rides on T-014 / deploy tickets.

## Implementation notes

- **Ordering matters.** The Node SDK must register instrumentations before the
  instrumented libraries (http/fastify/pg) are required. Prefer a preloaded
  `instrumentation.ts` via `node --import ./dist/instrumentation.js` (or the
  SWC/nest start equivalent) over importing it inside `main.ts`.
- Prefer the umbrella packages: `@opentelemetry/sdk-node` +
  `@opentelemetry/auto-instrumentations-node` (API), and
  `@opentelemetry/sdk-trace-web` + `@opentelemetry/auto-instrumentations-web` +
  `@opentelemetry/exporter-trace-otlp-http` (web). Verify latest stable
  versions via `pnpm info` before pinning (per root AGENTS.md).
- **Respect the standard env contract** (`OTEL_EXPORTER_OTLP_ENDPOINT`,
  `OTEL_SERVICE_NAME`, `OTEL_TRACES_SAMPLER`, …) — do not invent parallel env
  vars. The SDK reads most of these automatically.
- **Log correlation** with `nestjs-pino`/pino: inject `trace_id`/`span_id` from
  `trace.getActiveSpan()` via a pino `mixin` (or `@opentelemetry/instrumentation-pino`).
  Keep field names aligned with whatever a collector expects (`trace_id`,
  `span_id`).
- **CORS:** if web and API are cross-origin in production, the API must allow
  the `traceparent` request header (and `tracestate`) or propagation silently
  breaks — add it to the CORS allow-list.
- **Web bundle size:** the web SDK is non-trivial; keep it lazy/guarded so that
  when `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is unset we don't ship/initialise the
  exporter path. Note the gzipped delta in the PR.
- **Default-off is the contract:** every acceptance check must hold with the
  OTel env vars absent. This is what makes it safe to merge before any backend
  exists.

## References

- ADR: [ADR-0013](../docs/adr/0013-opentelemetry-observability.md)
- Related tickets: T-004 (api skeleton + pino), T-007 (web skeleton),
  T-011 (typed API client — fetch instrumentation already covers it),
  T-014 (dev docker-compose — where a collector could later be added)
- External: OpenTelemetry JS — <https://opentelemetry.io/docs/languages/js/>
