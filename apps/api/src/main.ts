import 'reflect-metadata';

import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { type Env, validateEnv } from './config/env.js';
import { ZodValidationFilter } from './lib/openapi/index.js';

// Validate before NestJS initialises — throws with a clear message on bad env.
validateEnv(process.env);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new ZodValidationFilter());

  // @fastify/swagger-ui declares @fastify/swagger as a required dependency and asserts
  // it on boot — registering the UI alone crashes the server. Register @fastify/swagger
  // to satisfy that dependency, and point the UI at /openapi.json: the canonical
  // OpenAPI 3.1 document generated from the zodRoute registry and served by
  // OpenApiController (used as-is for client codegen in T-011).
  await app.register(swagger);
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { url: '/openapi.json' },
  });

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('API_PORT', { infer: true });
  const host = config.get('API_HOST', { infer: true });

  await app.listen({ port, host });
}

void bootstrap();
