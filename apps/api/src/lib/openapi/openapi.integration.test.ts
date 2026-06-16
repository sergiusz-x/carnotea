import { type ErrorResponse } from '@carnotea/shared';
import { Body, Controller, Post } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { HealthController } from '../../health/health.controller.js';

import { OpenApiController } from './openapi.controller.js';
import { zodRoute } from './zod-route.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

// Importing readiness.controller for its module-level zodRoute side-effect so
// /readyz lands in the document without needing a database connection here.
import '../../health/readiness.controller.js';

const EchoSchema = z.object({ name: z.string(), count: z.number().int() });

zodRoute({
  method: 'post',
  path: '/echo',
  operationId: 'echo',
  tags: ['Test'],
  request: { body: EchoSchema },
  responses: {
    '200': { description: 'Echoes the body back', schema: EchoSchema },
    '400': { description: 'Invalid request body' },
  },
});

@Controller()
class EchoTestController {
  @Post('echo')
  echo(
    @Body(new ZodValidationPipe(EchoSchema)) body: z.infer<typeof EchoSchema>,
  ): z.infer<typeof EchoSchema> {
    return body;
  }
}

describe('OpenAPI wiring (integration)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OpenApiController, HealthController, EchoTestController],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /openapi.json returns a valid OpenAPI 3.1 document', async () => {
    const res = await app.inject({ method: 'GET', url: '/openapi.json' });

    expect(res.statusCode).toBe(200);
    const doc = res.json<{
      openapi: string;
      info: { title: string; version: string };
      paths: Record<string, unknown>;
    }>();
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.title).toBe('CarNotea API');
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining(['/healthz', '/readyz', '/echo']),
    );
  });

  it('GET /docs serves Swagger UI', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.payload).toContain('swagger-ui');
    expect(res.payload).toContain('/openapi.json');
  });

  it('GET /healthz works through the migrated route', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('POST /echo with a valid body returns the parsed value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { name: 'widget', count: 3 },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ name: 'widget', count: 3 });
  });

  it('POST /echo with a malformed body returns 400 with { code, message, issues }', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { name: 42 },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json<ErrorResponse>();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(typeof body.message).toBe('string');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues?.length).toBeGreaterThan(0);
  });
});
