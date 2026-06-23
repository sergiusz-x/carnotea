# ADR-0013: OpenTelemetry Observability Baseline

- **Status**: accepted
- **Date**: 2026-06-23
- **Deciders**: @sergiusz-x
- **Related tickets**: T-018

## Context

CarNotea is a two-tier application (NestJS API + Vite/React PWA) with no
observability beyond structured JSON logs via pino. As the number of tickets,
features, and deploys grows, the team needs **distributed tracing** to:

- Correlate a frontend action (e.g. "save fuel log") with the API request and
  the database query it triggered.
- Diagnose slow requests without guessing at log correlation.
- Track errors across service boundaries (proxied through Caddy in production).

OpenTelemetry (OTel) is the industry standard for observability telemetry
(traces, metrics, logs). It provides a single, vendor-neutral SDK that works on
both Node.js (API) and Browser (Web).

## Decision

We will add an OpenTelemetry observability baseline in T-018 consisting of:

### API (`apps/api`)

1. **Node.js SDK** — initialised in `apps/api/src/instrumentation.ts`, preloaded
   via Node's `--import` flag so auto-instrumentation wraps HTTP, Fastify, and
   pg **before** NestJS boots.
2. **Auto-instrumentations** — `@opentelemetry/auto-instrumentations-node`
   provides HTTP and pg instrumentation out of the box. Fastify is added
   separately via `@opentelemetry/instrumentation-fastify`.
3. **Log correlation** — `@opentelemetry/instrumentation-pino` injects
   `trace_id` and `span_id` into every pino log line, enabling log↔trace
   correlation in any backend (SigNoz, Grafana, Datadog, etc.).
4. **Exporter** — configured via standard `OTEL_EXPORTER_OTLP_ENDPOINT` env
   variable. When absent the SDK is never initialised (zero boot cost). In
   non-prod environments the OTel diagnostic logger is active at WARN level for
   developer feedback.
5. **Resource** — `service.name` defaults to `carnotea-api` (overridable via
   `OTEL_SERVICE_NAME`), plus `service.version` and `deployment.environment`.
6. **Graceful shutdown** — SDK shutdown on `SIGTERM`/`SIGINT`.
7. **Env validation** — Zod schema in `src/config/env.ts` declares all `OTEL_*`
   variables as `.optional()`, so boot never fails when they are absent.

### Web (`apps/web`)

1. **Web SDK** — initialised in `apps/web/src/otel.ts`, imported as the very
   first line of `main.tsx` so fetch/XHR patches are in place before any app
   code runs.
2. **Auto-instrumentations** — `@opentelemetry/auto-instrumentations-web`
   provides `document-load`, `fetch`, and `XHR` instrumentation.
3. **W3C trace context** — `W3CTraceContextPropagator` ensures every `fetch` to
   `/api` carries the `traceparent` and `tracestate` headers.
4. **Exporter** — configured via `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` (Vite env
   variable). When absent → no-op.
5. **CORS** — `traceparent` and `tracestate` are already in the API's
   `allowedHeaders` list (added in T-049).

### Cross-cutting

1. **Opt-in** — All OTel env variables are optional. No env file change means
   zero observability overhead. Add them to `.env` and restart to enable.
2. **Documentation** — ADR (this file), `.env.example`, `docs/tech-stack.md`,
   `apps/api/AGENTS.md`, and `apps/web/AGENTS.md` all updated in the same PR.

## Consequences

### Positive

- **Production-ready observability** with < 50 lines of SDK init code and zero
  application-level changes.
- **Vendor-neutral** — OTLP can be sent to any OTel-compatible backend
  (SigNoz, Grafana Tempo, Datadog, Honeycomb, Jaeger).
- **Log↔trace correlation** means we can start debugging from a log line and
  jump to the full trace, or start debugging from a slow trace and find the
  relevant log lines.
- **Default-off** protects development and CI from accidental trace export,
  token consumption, or boot failures.
- **Automatic CORS headers** for trace context — no manual configuration.

### Negative

- **Dependency surface** — six new direct dependencies per app (API: sdk-node,
  auto-instrumentations-node, exporter-trace-otlp-http, instrumentation-pino,
  instrumentation-fastify, resources + semantic-conventions; Web: sdk-trace-web,
  auto-instrumentations-web, exporter-trace-otlp-http, core, instrumentation,
  resources + semantic-conventions).
- **Bundle size** — Web OTel packages add ~50 KB gzipped. Tree-shaking removes
  them entirely when `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is not set (the whole
  `if` block compiles to a dead branch that Vite eliminates).

### Neutral

- The preloaded `--import` pattern means instrumentation.ts is loaded and
  executed before any application code. This is standard Node.js and the
  recommended OTel approach.
- `@opentelemetry/instrumentation-fastify` is deprecated (the maintainers
  recommend HTTP instrumentation which already captures Fastify traffic). We
  include it anyway for more detailed Fastify-specific spans.

## Alternatives considered

### Option A: Manual instrumentation only (no auto-instrumentation)

We would manually wrap every HTTP handler and database call. This gives full
control but requires touching every endpoint — the opposite of "baseline".
Auto-instrumentation is the right choice for a first PR; manual instrumentation
can be added per-feature as-needed later.

### Option B: Datadog APM

Datadog APM is a commercial product with excellent Node.js support. It is
rejected because:
- It ties us to Datadog's agent and format.
- The team has not decided on an observability backend yet.
- OTel can be sent to Datadog via the OTLP endpoint anyway (vendor-neutral).

### Option C: Sentry tracing

Sentry provides tracing as part of its error-monitoring SDK. It is a fine choice
but limited to Sentry's backend. OTel is the broader standard and can coexist
with Sentry if needed (Sentry accepts OTel data).