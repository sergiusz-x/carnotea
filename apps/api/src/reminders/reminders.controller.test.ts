import { type Reminder } from '@carnotea/shared';
import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { RemindersController } from './reminders.controller.js';
import { RemindersService } from './reminders.service.js';

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const existingId = '22222222-2222-4222-8222-222222222222';
const missingId = '33333333-3333-4333-8333-333333333333';

const sampleReminder: Reminder = {
  id: existingId,
  vehicleId,
  title: 'Oil change',
  description: null,
  mode: 'recurring',
  dueDate: null,
  dueMileage: null,
  intervalKm: 15000,
  intervalMonths: 12,
  lastPerformedDate: '2026-01-15',
  lastPerformedMileage: 81500,
  nextDueDate: '2027-01-15',
  nextDueMileage: 96500,
  status: 'pending',
  dueState: 'ok',
  notifiedAt: null,
  createdAt: '2026-06-21T10:00:00.000Z',
  updatedAt: '2026-06-21T10:00:00.000Z',
};

let currentSession: { user: { id: string; email: string } } | null = null;
const authStub = {
  api: { getSession: (): Promise<typeof currentSession> => Promise.resolve(currentSession) },
};

interface ServiceCall {
  method: string;
  args: unknown[];
}
let calls: ServiceCall[] = [];

const serviceStub = {
  list: (uid: string, vid: string, filters?: unknown) => {
    calls.push({ method: 'list', args: [uid, vid, filters] });
    return Promise.resolve([sampleReminder]);
  },
  getOwnedOrThrow: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'getOwnedOrThrow', args: [uid, vid, id] });
    if (id === missingId) {
      return Promise.reject(
        new NotFoundException({ code: 'NOT_FOUND', message: 'Reminder not found' }),
      );
    }
    return Promise.resolve(sampleReminder);
  },
  create: (uid: string, vid: string, body: unknown) => {
    calls.push({ method: 'create', args: [uid, vid, body] });
    return Promise.resolve(sampleReminder);
  },
  update: (uid: string, vid: string, id: string, body: unknown) => {
    calls.push({ method: 'update', args: [uid, vid, id, body] });
    return Promise.resolve(sampleReminder);
  },
  remove: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'remove', args: [uid, vid, id] });
    return Promise.resolve();
  },
};

describe('RemindersController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RemindersController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: RemindersService, useValue: serviceStub },
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
    calls = [];
    currentSession = { user: { id: userId, email: 'owner@example.com' } };
  });

  it('rejects an unauthenticated request with 401', async () => {
    currentSession = null;

    const res = await app.inject({ method: 'GET', url: `/api/vehicles/${vehicleId}/reminders` });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/vehicles/:vehicleId/reminders lists reminders', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/vehicles/${vehicleId}/reminders` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([sampleReminder]);
    expect(calls).toEqual([{ method: 'list', args: [userId, vehicleId, undefined] }]);
  });

  it('GET /api/vehicles/:vehicleId/reminders rejects non-uuid vehicleId with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/vehicles/not-a-uuid/reminders' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('GET /api/vehicles/:vehicleId/reminders/:id returns the reminder', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/reminders/${existingId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(sampleReminder);
    expect(calls).toEqual([{ method: 'getOwnedOrThrow', args: [userId, vehicleId, existingId] }]);
  });

  it('GET /api/vehicles/:vehicleId/reminders/:id surfaces 404 from service', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/reminders/${missingId}`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND', message: 'Reminder not found' });
  });

  it('POST /api/vehicles/:vehicleId/reminders takes owner from session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/reminders`,
      payload: {
        title: 'Insurance renewal',
        mode: 'one_off',
        dueDate: '2026-12-01',
        status: 'pending',
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[0]).toBe(userId);
    expect(createCall?.args[1]).toBe(vehicleId);
  });

  it('POST accepts a recurring reminder', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/reminders`,
      payload: {
        title: 'Oil change',
        mode: 'recurring',
        intervalKm: 15000,
        intervalMonths: 12,
        lastPerformedDate: '2026-01-15',
        lastPerformedMileage: 81500,
        status: 'pending',
      },
    });

    expect(res.statusCode).toBe(201);
  });

  it('POST rejects recurring reminder without matching last performed values', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/reminders`,
      payload: {
        title: 'Oil change',
        mode: 'recurring',
        intervalKm: 15000,
        status: 'pending',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
