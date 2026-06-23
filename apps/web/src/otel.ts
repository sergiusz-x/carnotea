/**
 * OpenTelemetry Web SDK initialisation.
 *
 * Inlined at the top of `main.tsx` before any other import so that
 * auto-instrumentation patches `fetch` and `XMLHttpRequest` *before* the
 * application uses them — guaranteeing W3C traceparent propagation on every
 * request to `/api`.
 *
 * Environment variable (Vite-exposed):
 *   VITE_OTEL_EXPORTER_OTLP_ENDPOINT  — OTLP HTTP endpoint for traces.
 *                                        When unset → no-op (zero cost).
 */

import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';

const otelExporterEndpoint =
  typeof import.meta.env !== 'undefined'
    ? (import.meta.env as Record<string, string | undefined>).VITE_OTEL_EXPORTER_OTLP_ENDPOINT
    : undefined;

if (otelExporterEndpoint) {
  const resource = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'carnotea-web',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
      (typeof import.meta.env !== 'undefined'
        ? (import.meta.env as Record<string, string | undefined>).MODE
        : undefined) || 'development',
  });

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: otelExporterEndpoint,
        }),
      ),
    ],
  });

  // Register the provider with W3C trace context propagation so that
  // fetch / XHR calls carry the traceparent and tracestate headers.
  provider.register({
    propagator: new W3CTraceContextPropagator(),
  });

  // Auto-instrument document load, fetch, and XHR.
  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-document-load': { enabled: true },
        '@opentelemetry/instrumentation-fetch': {
          enabled: true,
          propagateTraceHeaderCorsUrls: [/\/api\//],
          clearTimingResources: true,
        },
        '@opentelemetry/instrumentation-xml-http-request': {
          enabled: true,
          propagateTraceHeaderCorsUrls: [/\/api\//],
          clearTimingResources: true,
        },
      }),
    ],
  });
}
