import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { FuelLogsController } from './fuel-logs.controller.js';
import { FuelLogsService, type FuelLogResponse } from './fuel-logs.service.js';

// DB-free controller test — the service is stubbed and the real AuthGuard runs
// against a stubbed better-auth session. It pins routing, auth enforcement,
// validation, status codes, and that totalCost is never read from the body.

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const existingId = '22222222-2222-4222-8222-222222222222';
const missingId = '33333333-3333-4333-8333-333333333333';

const sampleLog: FuelLogResponse = {
  id: existingId,
  vehicleId,
  fuelDate: '2026-01-15',
  mileage: 50000,
  liters: 40,
  pricePerLiter: 1.8,
  totalCost: 72,
  stationName: null,
  isFullTank: true,
  consumptionHint: null,
  createdAt: '2026-01-15T10:00:00.000Z',
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
  list: (uid: string, vid: string) => {
    calls.push({ method: 'list', args: [uid, vid] });
    return Promise.resolve([sampleLog]);
  },
  getOwnedOrThrow: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'getOwnedOrThrow', args: [uid, vid, id] });
    if (id === missingId) {
      return Promise.reject(
        new NotFoundException({ code: 'NOT_FOUND', message: 'Fuel log not found' }),
      );
    }
    return Promise.resolve(sampleLog);
  },
  create: (uid: string, vid: string, body: unknown) => {
    calls.push({ method: 'create', args: [uid, vid, body] });
    return Promise.resolve(sampleLog);
  },
  update: (uid: string, vid: string, id: string, body: unknown) => {
    calls.push({ method: 'update', args: [uid, vid, id, body] });
    return Promise.resolve(sampleLog);
  },
  remove: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'remove', args: [uid, vid, id] });
    return Promise.resolve();
  },
};

describe('FuelLogsController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FuelLogsController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: FuelLogsService, useValue: serviceStub },
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

    const res = await app.inject({ method: 'GET', url: `/vehicles/${vehicleId}/fuel-logs` });

    expect(res.statusCode).toBe(401);
  });

  it('GET /vehicles/:vehicleId/fuel-logs lists fuel logs', async () => {
    const res = await app.inject({ method: 'GET', url: `/vehicles/${vehicleId}/fuel-logs` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([sampleLog]);
    expect(calls).toEqual([{ method: 'list', args: [userId, vehicleId] }]);
  });

  it('GET /vehicles/:vehicleId/fuel-logs rejects non-uuid vehicleId with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/vehicles/not-a-uuid/fuel-logs' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('GET /vehicles/:vehicleId/fuel-logs/:id returns the fuel log', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/vehicles/${vehicleId}/fuel-logs/${existingId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(sampleLog);
    expect(calls).toEqual([{ method: 'getOwnedOrThrow', args: [userId, vehicleId, existingId] }]);
  });

  it('GET /vehicles/:vehicleId/fuel-logs/:id surfaces 404 from service', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/vehicles/${vehicleId}/fuel-logs/${missingId}`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND', message: 'Fuel log not found' });
  });

  it('POST /vehicles/:vehicleId/fuel-logs takes owner from session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/vehicles/${vehicleId}/fuel-logs`,
      payload: {
        fuelDate: '2026-01-15',
        mileage: 50000,
        liters: 40,
        pricePerLiter: 1.8,
        isFullTank: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[0]).toBe(userId);
    expect(createCall?.args[1]).toBe(vehicleId);
    expect(createCall?.args[2]).not.toHaveProperty('totalCost');
  });

  it('POST /vehicles/:vehicleId/fuel-logs ignores totalCost in body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/vehicles/${vehicleId}/fuel-logs`,
      payload: {
        fuelDate: '2026-01-15',
        mileage: 50000,
        liters: 40,
        pricePerLiter: 1.8,
        totalCost: 999,
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[2]).not.toHaveProperty('totalCost');
  });

  it('POST /vehicles/:vehicleId/fuel-logs rejects invalid body with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/vehicles/${vehicleId}/fuel-logs`,
      payload: { fuelDate: '2026-01-15' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects liters <= 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/vehicles/${vehicleId}/fuel-logs`,
      payload: { fuelDate: '2026-01-15', mileage: 50000, liters: 0, pricePerLiter: 1.8 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST rejects pricePerLiter <= 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/vehicles/${vehicleId}/fuel-logs`,
      payload: { fuelDate: '2026-01-15', mileage: 50000, liters: 40, pricePerLiter: 0 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST rejects mileage < 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/vehicles/${vehicleId}/fuel-logs`,
      payload: { fuelDate: '2026-01-15', mileage: -1, liters: 40, pricePerLiter: 1.8 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('PATCH /vehicles/:vehicleId/fuel-logs/:id forwards update to service', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/vehicles/${vehicleId}/fuel-logs/${existingId}`,
      payload: { liters: 45 },
    });

    expect(res.statusCode).toBe(200);
    const updateCall = calls.find((c) => c.method === 'update');
    expect(updateCall?.args[0]).toBe(userId);
    expect(updateCall?.args[1]).toBe(vehicleId);
    expect(updateCall?.args[2]).toBe(existingId);
    expect(updateCall?.args[3]).toMatchObject({ liters: 45 });
  });

  it('DELETE /vehicles/:vehicleId/fuel-logs/:id returns 204', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/vehicles/${vehicleId}/fuel-logs/${existingId}`,
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    expect(calls).toEqual([{ method: 'remove', args: [userId, vehicleId, existingId] }]);
  });
});
