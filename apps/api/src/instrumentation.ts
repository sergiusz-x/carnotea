/**
 * OpenTelemetry Node.js SDK initialisation.
 *
 * This file is preloaded via `--import` before NestJS boot so auto-instrumentation
 * wraps HTTP, Fastify, and pg modules *before* they are imported by the app.
 *
 * Environment variables:
 *   OTEL_EXPORTER_OTLP_ENDPOINT  — required for OTLP export; absent → no-op
 *   OTEL_SERVICE_NAME            — overrides the default `carnotea-api`
 *   OTEL_RESOURCE_ATTRIBUTES     — comma-separated key=value pairs
 *   NODE_ENV                     — used for deployment.environment resource attr
 *
 * All OTEL_* variables are optional in the Zod schema (see config/env.ts).
 * When the endpoint is absent the SDK is never initialised, keeping boot cost
 * at zero.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env before reading OTEL_* vars — this file is preloaded via --import
// before main.ts, so load-env.js hasn't run yet.
let dir = import.meta.dirname;
for (let i = 0; i < 5; i++) {
  const p = resolve(dir, '.env');
  if (existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
  dir = resolve(dir, '..');
}

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const otelExporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (!otelExporterEndpoint) {
  // Tracing is disabled. In non-prod environments we still enable the
  // diagnostic logger at WARN level so developer mistakes are visible.
  if (process.env.NODE_ENV !== 'production') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
  }
} else {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'carnotea-api';

  const attrs: Record<string, string> = {
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version || '0.0.0',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  };

  // Parse OTEL_RESOURCE_ATTRIBUTES (comma-separated key=value pairs).
  const extraAttrs = process.env.OTEL_RESOURCE_ATTRIBUTES;
  if (extraAttrs) {
    for (const pair of extraAttrs.split(',')) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        attrs[pair.slice(0, eqIdx).trim()] = pair.slice(eqIdx + 1).trim();
      }
    }
  }

  const resource = resourceFromAttributes(attrs);

  const traceExporter = new OTLPTraceExporter({
    url: otelExporterEndpoint,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        // Noisy / unneeded for this service
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- @fastify/otel not yet bundled
      new FastifyInstrumentation(),
      new PinoInstrumentation(),
    ],
  });

  sdk.start();

  // ── Graceful shutdown ────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    try {
      await sdk.shutdown();
    } finally {
      process.kill(process.pid, signal);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}
