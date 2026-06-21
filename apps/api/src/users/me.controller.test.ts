import type { users, Db } from '@carnotea/db';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { DB } from '../db/db.constants.js';

import { MeController } from './me.controller.js';

const userId = '11111111-1111-4111-8111-111111111111';

const baseProfile = {
  id: userId,
  email: 'jan@example.com',
  firstName: 'Jan',
  lastName: 'Kowalski',
  localePref: 'en',
  unitsPref: 'metric',
  currencyPref: 'EUR',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
} satisfies typeof users.$inferSelect;

const contractProfile = {
  id: userId,
  email: 'jan@example.com',
  firstName: 'Jan',
  lastName: 'Kowalski',
  localePref: 'en',
  unitsPref: 'metric',
  currencyPref: 'EUR',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

let currentSession: { user: { id: string; email: string } } | null = null;
let storedProfile: typeof users.$inferSelect | undefined;

const authStub = {
  api: {
    getSession: (): Promise<typeof currentSession> => Promise.resolve(currentSession),
  },
};

// A minimally viable Db stub that supports findFirst, insert, and update.
const dbStub = {
  query: {
    users: {
      findFirst: () => Promise.resolve(storedProfile),
    },
  },
  insert: () => ({
    values: () => ({
      returning: () => {
        storedProfile = baseProfile;
        return Promise.resolve([baseProfile]);
      },
    }),
  }),
  update: () => ({
    set: (data: Record<string, unknown>) => ({
      where: () => ({
        returning: () => {
          if (!storedProfile) return Promise.resolve([]);
          storedProfile = {
            ...storedProfile,
            ...data,
            updatedAt: new Date(data.updatedAt as Date),
          };
          return Promise.resolve([storedProfile]);
        },
      }),
    }),
  }),
} as unknown as Db;

describe('MeController', () => {
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

  beforeEach(() => {
    currentSession = { user: { id: userId, email: 'jan@example.com' } };
    storedProfile = { ...baseProfile };
  });

  describe('GET /api/me', () => {
    it('returns 401 for an unauthenticated request', async () => {
      currentSession = null;

      const res = await app.inject({ method: 'GET', url: '/api/me' });

      expect(res.statusCode).toBe(401);
    });

    it('returns the authenticated user profile with preferences', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/me' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(contractProfile);
    });

    it('provisions a profile when the users row does not exist', async () => {
      storedProfile = undefined;

      const res = await app.inject({ method: 'GET', url: '/api/me' });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        id: userId,
        email: 'jan@example.com',
      });
    });
  });

  describe('PATCH /api/me', () => {
    it('updates name and preferences', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/me',
        payload: {
          firstName: 'Janusz',
          lastName: 'Kowal',
          localePref: 'pl',
          unitsPref: 'imperial',
          currencyPref: 'USD',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        firstName: 'Janusz',
        lastName: 'Kowal',
        localePref: 'pl',
        unitsPref: 'imperial',
        currencyPref: 'USD',
      });
    });

    it('ignores email in update body (read-only field)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/me',
        payload: { email: 'hacker@evil.com' },
      });

      expect(res.statusCode).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.json().email).toBe('jan@example.com');
    });

    it('rejects invalid locale', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/me',
        payload: { localePref: 'de' },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      console.log('invalid locale response:', { status: res.statusCode, body: res.json() });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('rejects invalid currency', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/me',
        payload: { currencyPref: 'EURO' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('returns 401 for an unauthenticated PATCH', async () => {
      currentSession = null;

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/me',
        payload: { firstName: 'Janusz' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('updates a single preference field without affecting others', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/me',
        payload: { localePref: 'pl' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        localePref: 'pl',
        unitsPref: 'metric',
        currencyPref: 'EUR',
        firstName: 'Jan',
        lastName: 'Kowalski',
      });
    });
  });
});
