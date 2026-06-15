import 'reflect-metadata';

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

  // Serve Swagger UI at /docs, pointing at our /openapi.json endpoint.
  // The spec is generated from the zodRoute registry populated during module init.
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
