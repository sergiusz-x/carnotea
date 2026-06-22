import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { ChargingSessionsController } from './charging-sessions.controller.js';
import {
  ChargingSessionsService,
  type ChargingSessionResponse,
} from './charging-sessions.service.js';

// DB-free controller test — the service is stubbed and the real AuthGuard runs
// against a stubbed better-auth session. It pins routing, auth enforcement,
// validation, status codes, and that totalCost is never read from the body.

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const existingId = '22222222-2222-4222-8222-222222222222';
const missingId = '33333333-3333-4333-8333-333333333333';

const sampleSession: ChargingSessionResponse = {
  id: existingId,
  vehicleId,
  chargeDate: '2026-04-01',
  mileage: 50000,
  energyKwh: 40,
  pricePerKwh: 0.45,
  totalCost: 18,
  chargerType: 'dc_ccs',
  socStartPercent: 20,
  socEndPercent: 80,
  stationName: 'Supercharger XYZ',
  isFullCharge: true,
  createdAt: '2026-04-01T10:00:00.000Z',
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
    return Promise.resolve([sampleSession]);
  },
  getOwnedOrThrow: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'getOwnedOrThrow', args: [uid, vid, id] });
    if (id === missingId) {
      return Promise.reject(
        new NotFoundException({ code: 'NOT_FOUND', message: 'Charging session not found' }),
      );
    }
    return Promise.resolve(sampleSession);
  },
  create: (uid: string, vid: string, body: unknown) => {
    calls.push({ method: 'create', args: [uid, vid, body] });
    return Promise.resolve(sampleSession);
  },
  update: (uid: string, vid: string, id: string, body: unknown) => {
    calls.push({ method: 'update', args: [uid, vid, id, body] });
    return Promise.resolve(sampleSession);
  },
  remove: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'remove', args: [uid, vid, id] });
    return Promise.resolve();
  },
};

describe('ChargingSessionsController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ChargingSessionsController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: ChargingSessionsService, useValue: serviceStub },
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

    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/charging-sessions`,
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/vehicles/:vehicleId/charging-sessions lists charging sessions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/charging-sessions`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([sampleSession]);
    expect(calls).toEqual([{ method: 'list', args: [userId, vehicleId] }]);
  });

  it('GET /api/vehicles/:vehicleId/charging-sessions rejects non-uuid vehicleId with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/vehicles/not-a-uuid/charging-sessions',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('GET /api/vehicles/:vehicleId/charging-sessions/:id returns the session', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/charging-sessions/${existingId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(sampleSession);
    expect(calls).toEqual([{ method: 'getOwnedOrThrow', args: [userId, vehicleId, existingId] }]);
  });

  it('GET /api/vehicles/:vehicleId/charging-sessions/:id surfaces 404 from service', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/charging-sessions/${missingId}`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND', message: 'Charging session not found' });
  });

  it('POST /api/vehicles/:vehicleId/charging-sessions takes owner from session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/charging-sessions`,
      payload: {
        chargeDate: '2026-04-01',
        mileage: 50000,
        energyKwh: 40,
        pricePerKwh: 0.45,
        chargerType: 'dc_ccs',
        isFullCharge: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[0]).toBe(userId);
    expect(createCall?.args[1]).toBe(vehicleId);
    expect(createCall?.args[2]).not.toHaveProperty('totalCost');
  });

  it('POST /api/vehicles/:vehicleId/charging-sessions ignores totalCost in body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/charging-sessions`,
      payload: {
        chargeDate: '2026-04-01',
        mileage: 50000,
        energyKwh: 40,
        pricePerKwh: 0.45,
        chargerType: 'dc_ccs',
        totalCost: 999,
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[2]).not.toHaveProperty('totalCost');
  });

  it('POST /api/vehicles/:vehicleId/charging-sessions rejects invalid body with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/charging-sessions`,
      payload: { chargeDate: '2026-04-01' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects energyKwh <= 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/charging-sessions`,
      payload: {
        chargeDate: '2026-04-01',
        mileage: 50000,
        energyKwh: 0,
        pricePerKwh: 0.45,
        chargerType: 'dc_ccs',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST rejects pricePerKwh <= 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/charging-sessions`,
      payload: {
        chargeDate: '2026-04-01',
        mileage: 50000,
        energyKwh: 40,
        pricePerKwh: 0,
        chargerType: 'dc_ccs',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST rejects mileage < 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/charging-sessions`,
      payload: {
        chargeDate: '2026-04-01',
        mileage: -1,
        energyKwh: 40,
        pricePerKwh: 0.45,
        chargerType: 'dc_ccs',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST rejects unknown chargerType with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/charging-sessions`,
      payload: {
        chargeDate: '2026-04-01',
        mileage: 50000,
        energyKwh: 40,
        pricePerKwh: 0.45,
        chargerType: 'nope',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('PATCH /api/vehicles/:vehicleId/charging-sessions/:id forwards update to service', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${vehicleId}/charging-sessions/${existingId}`,
      payload: { energyKwh: 45 },
    });

    expect(res.statusCode).toBe(200);
    const updateCall = calls.find((c) => c.method === 'update');
    expect(updateCall?.args[0]).toBe(userId);
    expect(updateCall?.args[1]).toBe(vehicleId);
    expect(updateCall?.args[2]).toBe(existingId);
    expect(updateCall?.args[3]).toMatchObject({ energyKwh: 45 });
  });

  it('DELETE /api/vehicles/:vehicleId/charging-sessions/:id returns 204', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/vehicles/${vehicleId}/charging-sessions/${existingId}`,
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    expect(calls).toEqual([{ method: 'remove', args: [userId, vehicleId, existingId] }]);
  });
});
