import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DB } from '../db/db.constants.js';

import { AUTH } from './auth.constants.js';
import { AuthModule } from './auth.module.js';

const authStub = {
  handler: async (request: Request): Promise<Response> => {
    const body = request.method === 'GET' ? '' : await request.text();
    return new Response(JSON.stringify({ path: new URL(request.url).pathname, body }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'set-cookie': 'session=abc; Path=/' },
    });
  },
  api: { getSession: (): Promise<null> => Promise.resolve(null) },
};

const configStub = {
  get: (key: string): string | number => {
    const values: Record<string, string | number> = {
      BETTER_AUTH_URL: 'http://localhost:3001',
      BETTER_AUTH_SECRET: 'test-secret-at-least-16-chars',
      CORS_ORIGINS: 'http://localhost:5173',
      NODE_ENV: 'test',
      SMTP_PORT: 587,
      EMAIL_FROM: 'CarNotea <noreply@localhost>',
      EMAIL_REPLY_TO: 'noreply@localhost',
    };
    return values[key] ?? 'stub-value';
  },
};

@Global()
@Module({
  providers: [
    { provide: DB, useValue: {} },
    { provide: ConfigService, useValue: configStub },
  ],
  exports: [DB, ConfigService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Nest module classes are intentionally empty.
class FakeDepsModule {}

describe('AuthModule mounts better-auth at /api/auth/*', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [FakeDepsModule, AuthModule] })
      .overrideProvider(AUTH)
      .useValue(authStub)
      .overrideProvider(ConfigService)
      .useValue(configStub)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('forwards GET requests, set-cookie, and no-store cache headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/get-session' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ path: '/api/auth/get-session', body: '' });
    expect(res.headers['set-cookie']).toContain('session=abc; Path=/');
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('forwards the raw POST body untouched', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      payload: { email: 'jan@example.com', password: 'secret' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      path: '/api/auth/sign-in/email',
      body: JSON.stringify({ email: 'jan@example.com', password: 'secret' }),
    });
  });
});
