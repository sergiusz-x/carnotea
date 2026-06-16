---
id: T-050
title: OpenTelemetry metrics + basic alerting (follow-up to T-018)
status: ready
priority: medium
owner: ~
dependencies: [T-018]
labels: [observability, ops]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-050 — OpenTelemetry metrics + basic alerting (follow-up to T-018)

## Goal

Add the OpenTelemetry **metrics** signal to the API (RED + runtime metrics) and
a basic alerting story, keeping the same default-off, OTLP-env-driven contract
as the tracing baseline — no bundled backend.

## Context

T-018 deliberately scoped metrics out and shipped traces-only with a standard
`OTEL_*` env contract and a no-op default. With the prod stack and CD landing,
the next gap is "is the service healthy and is anyone told when it isn't." This
ticket adds request and runtime metrics and a documented alerting path, reusing
the existing SDK and exporter wiring so it stays a no-op until an OTLP metrics
endpoint is configured.

## Acceptance criteria

- [ ] The API emits **RED** metrics for HTTP requests: request **R**ate,
      **E**rror count/ratio, and request **D**uration (latency histogram),
      labelled by route and status — via auto-instrumentation where possible.
- [ ] **Runtime** metrics are emitted (Node/process: event-loop lag, heap/memory,
      GC, CPU) using the OTel host/runtime instrumentation.
- [ ] Metrics export over **OTLP**, selected purely from standard `OTEL_*` env
      vars; when no OTLP metrics endpoint is set the meter is a **no-op** and the
      app runs exactly as before (no errors, no extra requests).
- [ ] The metrics SDK shares the existing T-018 resource attributes
      (`service.name`, `service.version`, `deployment.environment`) and flushes/
      shuts down gracefully on `SIGTERM`.
- [ ] A basic **alerting** story is documented: the key signals to alert on
      (error ratio, p95 latency, instance down) with example threshold rules for
      a collector/backend, made concrete enough to wire up — **without bundling**
      Prometheus/Grafana/Alertmanager into the repo.
- [ ] `.env.example` documents the metrics-related `OTEL_*` vars (commented,
      disabled by default); `docs/architecture.md` / the observability doc and
      `apps/api/AGENTS.md` are updated.

## Files to touch

- `apps/api/src/instrumentation.ts` (extend the SDK with a MeterProvider +
  metric exporter/reader)
- `apps/api/src/config/env.ts` (optional metrics `OTEL_*` vars)
- `pnpm-workspace.yaml` (catalog entries for metric exporter / runtime
  instrumentation packages)
- `.env.example`
- `docs/architecture.md` (or `docs/adr/0011-...`) + `apps/api/AGENTS.md`
  (alerting guidance, example rules)

## Out of scope

- Running or bundling a metrics backend / collector / dashboards (Prometheus,
  Grafana, Tempo, Alertmanager) — config + docs only, same as T-018.
- The OTel **logs** signal — pino stays the log pipeline.
- Web (browser) metrics / RUM — server-side metrics only for now.
- SLOs, error budgets, and on-call/paging integration.
- Custom business metrics — RED + runtime only; domain metrics are later
  tickets.

## Implementation notes

- Extend the existing T-018 SDK rather than standing up a parallel one: add a
  `MeterProvider` with a `PeriodicExportingMetricReader` + OTLP metric exporter,
  reusing the same resource and shutdown hooks.
- HTTP RED metrics largely come from `@opentelemetry/auto-instrumentations-node`
  (http/fastify) emitting server duration histograms; add runtime metrics via
  `@opentelemetry/host-metrics` (or the runtime-node instrumentation). Verify
  latest stable versions via `pnpm info` before pinning.
- Keep the **default-off contract**: every check must hold with the metrics env
  vars absent, mirroring T-018 — this is what keeps it safe to merge pre-backend.
- For alerting, give copy-pasteable example rules (e.g. PromQL for error ratio
  and p95) and name the env knobs an operator sets to point at their collector;
  do not commit a backend.

## References

- Related tickets: T-018 (OTel tracing baseline — extends it),
  T-044 (perf budget — distinct concern), T-045 (prod stack where a collector
  could later run)
- ADR: [ADR-0011](../docs/adr/0011-opentelemetry-observability.md)
- External: OpenTelemetry metrics (JS) —
  <https://opentelemetry.io/docs/languages/js/instrumentation/#metrics>
