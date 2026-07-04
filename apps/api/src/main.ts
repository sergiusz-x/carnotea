import 'reflect-metadata';
import './load-env.js';

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { type FastifyRequest } from 'fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { type Env, validateEnv } from './config/env.js';

const RATE_LIMITED_AUTH_PREFIXES = [
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/forget-password',
  '/api/auth/reset-password',
] as const;

function isStrictAuthRateLimitRoute(url: string): boolean {
  return RATE_LIMITED_AUTH_PREFIXES.some((prefix) => url.startsWith(prefix));
}

// Validate before NestJS initialises — throws with a clear message on bad env.
validateEnv(process.env);

async function bootstrap(): Promise<void> {
  const env = validateEnv(process.env);
  const bodyLimit = env.BODY_LIMIT;

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('API_PORT', { infer: true });
  const host = config.get('API_HOST', { infer: true });
  const isProduction = env.NODE_ENV === 'production';

  // ------------------------------------------------------------------
  // Security hardening (T-049)
  // ------------------------------------------------------------------
  const fastifyInstance = app.getHttpAdapter().getInstance();
  const register = fastifyInstance.register.bind(fastifyInstance) as unknown as (
    plugin: unknown,
    options: Record<string, unknown>,
  ) => PromiseLike<unknown>;

  // 1. Helmet — security response headers
  await register(helmet, {
    contentSecurityPolicy: isProduction ? undefined : false,
    hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
  });

  // 2. CORS — strict allow-list in production, permissive in dev
  const allowedOrigins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  await register(cors, {
    origin: isProduction ? allowedOrigins : true,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'traceparent', // required for T-018 OpenTelemetry propagation
      'tracestate', // required for T-018 OpenTelemetry propagation
    ],
  });

  // 3. Rate limiting
  await register(rateLimit, {
    max: (request: FastifyRequest) =>
      isStrictAuthRateLimitRoute(request.url) ? env.RATE_LIMIT_AUTH_MAX : env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request: FastifyRequest) => request.ip,
  });

  await app.listen({ port, host });
}

void bootstrap();
