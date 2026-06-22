import { NotFoundException, ConflictException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { ExpensesController } from './expenses.controller.js';
import { ExpensesService, type ExpenseResponse } from './expenses.service.js';

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const existingId = '22222222-2222-4222-8222-222222222222';
const autoSyncedId = '44444444-4444-4444-8444-444444444444';
const missingId = '33333333-3333-4333-8333-333333333333';

const sampleExpense: ExpenseResponse = {
  id: existingId,
  vehicleId,
  category: 'fuel',
  expenseDate: '2026-06-15',
  amount: 50.0,
  description: null,
  sourceType: 'manual',
  sourceId: null,
  isAutoSynced: false,
  createdAt: '2026-06-15T10:00:00.000Z',
  updatedAt: '2026-06-15T10:00:00.000Z',
};

const autoSyncedExpense: ExpenseResponse = {
  id: autoSyncedId,
  vehicleId,
  category: 'fuel',
  expenseDate: '2026-06-14',
  amount: 72.0,
  description: null,
  sourceType: 'fuel_log',
  sourceId: '55555555-5555-4555-8555-555555555555',
  isAutoSynced: true,
  createdAt: '2026-06-14T10:00:00.000Z',
  updatedAt: '2026-06-14T10:00:00.000Z',
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
  list: (uid: string, vid: string, source?: string) => {
    calls.push({ method: 'list', args: [uid, vid, source] });
    return Promise.resolve([sampleExpense, autoSyncedExpense]);
  },
  getOwnedOrThrow: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'getOwnedOrThrow', args: [uid, vid, id] });
    if (id === missingId) {
      return Promise.reject(
        new NotFoundException({ code: 'NOT_FOUND', message: 'Expense not found' }),
      );
    }
    return Promise.resolve(id === autoSyncedId ? autoSyncedExpense : sampleExpense);
  },
  create: (uid: string, vid: string, body: unknown) => {
    calls.push({ method: 'create', args: [uid, vid, body] });
    return Promise.resolve(sampleExpense);
  },
  update: (uid: string, vid: string, id: string, body: unknown) => {
    calls.push({ method: 'update', args: [uid, vid, id, body] });
    if (id === autoSyncedId) {
      return Promise.reject(
        new ConflictException({
          code: 'CONFLICT',
          message: 'Cannot edit an auto-synced expense. Edit the source entry instead.',
        }),
      );
    }
    return Promise.resolve(sampleExpense);
  },
  remove: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'remove', args: [uid, vid, id] });
    if (id === autoSyncedId) {
      return Promise.reject(
        new ConflictException({
          code: 'CONFLICT',
          message: 'Cannot delete an auto-synced expense. Delete the source entry instead.',
        }),
      );
    }
    return Promise.resolve();
  },
};

describe('ExpensesController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: ExpensesService, useValue: serviceStub },
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

    const res = await app.inject({ method: 'GET', url: `/api/vehicles/${vehicleId}/expenses` });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/vehicles/:vehicleId/expenses lists expenses', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/vehicles/${vehicleId}/expenses` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([sampleExpense, autoSyncedExpense]);
    expect(calls).toEqual([{ method: 'list', args: [userId, vehicleId, undefined] }]);
  });

  it('GET /api/vehicles/:vehicleId/expenses?source=manual filters by source', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/expenses?source=manual`,
    });

    expect(res.statusCode).toBe(200);
    expect(calls).toEqual([{ method: 'list', args: [userId, vehicleId, 'manual'] }]);
  });

  it('GET /api/vehicles/:vehicleId/expenses rejects non-uuid vehicleId with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/vehicles/not-a-uuid/expenses' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('GET /api/vehicles/:vehicleId/expenses/:id returns the expense', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/expenses/${existingId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(sampleExpense);
    expect(calls).toEqual([{ method: 'getOwnedOrThrow', args: [userId, vehicleId, existingId] }]);
  });

  it('GET /api/vehicles/:vehicleId/expenses/:id surfaces 404 from service', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/expenses/${missingId}`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND', message: 'Expense not found' });
  });

  it('POST /api/vehicles/:vehicleId/expenses takes owner from session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/expenses`,
      payload: {
        category: 'fuel',
        expenseDate: '2026-06-15',
        amount: 50,
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[0]).toBe(userId);
    expect(createCall?.args[1]).toBe(vehicleId);
  });

  it('POST /api/vehicles/:vehicleId/expenses rejects invalid body with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/expenses`,
      payload: { expenseDate: '2026-06-15' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects negative amount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/expenses`,
      payload: { category: 'fuel', expenseDate: '2026-06-15', amount: -10 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST rejects unknown category code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/expenses`,
      payload: { category: 'nope', expenseDate: '2026-06-15', amount: 50 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('PATCH /api/vehicles/:vehicleId/expenses/:id forwards update to service', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${vehicleId}/expenses/${existingId}`,
      payload: { amount: 60 },
    });

    expect(res.statusCode).toBe(200);
    const updateCall = calls.find((c) => c.method === 'update');
    expect(updateCall?.args[0]).toBe(userId);
    expect(updateCall?.args[1]).toBe(vehicleId);
    expect(updateCall?.args[2]).toBe(existingId);
    expect(updateCall?.args[3]).toMatchObject({ amount: 60 });
  });

  it('PATCH on auto-synced expense returns 409', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${vehicleId}/expenses/${autoSyncedId}`,
      payload: { amount: 60 },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'CONFLICT' });
  });

  it('DELETE /api/vehicles/:vehicleId/expenses/:id returns 204', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/vehicles/${vehicleId}/expenses/${existingId}`,
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    expect(calls).toEqual([{ method: 'remove', args: [userId, vehicleId, existingId] }]);
  });

  it('DELETE on auto-synced expense returns 409', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/vehicles/${vehicleId}/expenses/${autoSyncedId}`,
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'CONFLICT' });
  });
});
