import { Body, Controller, Module, Post } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { zodRoute } from './registry.js';
import { ZodValidationFilter } from './zod-validation.filter.js';

const echoRoute = zodRoute({
  method: 'post',
  path: '/echo',
  operationId: 'echo',
  tags: ['test'],
  body: z.object({ name: z.string() }),
  response: z.object({ name: z.string() }),
});

@Controller()
class EchoController {
  @Post('echo')
  echo(@Body() body: unknown): { name: string } {
    return echoRoute.validateBody(body);
  }
}

@Module({ controllers: [EchoController] })
class EchoModule {}

describe('ZodValidationFilter', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [EchoModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalFilters(new ZodValidationFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with the validated body for a valid request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { name: 'Alice' },
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({ name: 'Alice' });
  });

  it('returns 400 with error envelope for an invalid body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { name: 42 },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { code: string; message: string; issues: unknown[] };
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.message).toBeDefined();
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });
});
