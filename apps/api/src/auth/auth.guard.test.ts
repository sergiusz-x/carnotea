import { type Db } from '@carnotea/db';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DB } from '../db/db.constants.js';
import { MeController } from '../users/me.controller.js';

import { AUTH } from './auth.constants.js';
import { AuthGuard } from './auth.guard.js';

const profile = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'jan@example.com',
  firstName: 'Jan',
  lastName: 'Kowalski',
  localePref: 'en',
  unitsPref: 'metric',
  currencyPref: 'EUR',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

let currentSession: { user: { id: string; email: string } } | null = null;

const authStub = {
  api: {
    getSession: (): Promise<typeof currentSession> => Promise.resolve(currentSession),
  },
};

const dbStub = {
  query: {
    users: {
      findFirst: (): Promise<typeof profile | undefined> =>
        Promise.resolve(currentSession ? profile : undefined),
    },
  },
} as unknown as Db;

describe('AuthGuard + GET /api/me', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MeController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: DB, useValue: dbStub },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for an unauthenticated request', async () => {
    currentSession = null;

    const res = await app.inject({ method: 'GET', url: '/api/me' });

    expect(res.statusCode).toBe(401);
  });

  it('returns the authenticated user profile', async () => {
    currentSession = { user: { id: profile.id, email: profile.email } };

    const res = await app.inject({ method: 'GET', url: '/api/me' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: profile.id,
      email: profile.email,
      firstName: 'Jan',
      lastName: 'Kowalski',
      localePref: 'en',
      unitsPref: 'metric',
      currencyPref: 'EUR',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });
});
