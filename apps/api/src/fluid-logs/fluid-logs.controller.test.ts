import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { FluidLogsController } from './fluid-logs.controller.js';
import { FluidLogsService, type FluidLogResponse } from './fluid-logs.service.js';

// DB-free controller test — the service is stubbed and the real AuthGuard runs
// against a stubbed better-auth session. It pins routing, auth enforcement,
// validation, and status codes.

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const existingId = '22222222-2222-4222-8222-222222222222';
const missingId = '33333333-3333-4333-8333-333333333333';

const sampleFluidLog: FluidLogResponse = {
  id: existingId,
  vehicleId,
  changeDate: '2026-04-01',
  mileage: 50000,
  fluidType: 'engine_oil',
  quantityLiters: 4.5,
  cost: 45.5,
  intervalKm: 10000,
  intervalMonths: 12,
  workshopName: 'ACME Garage',
  notes: null,
  nextDueMileage: 60000,
  nextDueDate: '2027-04-01',
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
    return Promise.resolve([sampleFluidLog]);
  },
  getOwnedOrThrow: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'getOwnedOrThrow', args: [uid, vid, id] });
    if (id === missingId) {
      return Promise.reject(
        new NotFoundException({ code: 'NOT_FOUND', message: 'Fluid log not found' }),
      );
    }
    return Promise.resolve(sampleFluidLog);
  },
  create: (uid: string, vid: string, body: unknown) => {
    calls.push({ method: 'create', args: [uid, vid, body] });
    return Promise.resolve(sampleFluidLog);
  },
  update: (uid: string, vid: string, id: string, body: unknown) => {
    calls.push({ method: 'update', args: [uid, vid, id, body] });
    return Promise.resolve(sampleFluidLog);
  },
  remove: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'remove', args: [uid, vid, id] });
    return Promise.resolve();
  },
};

describe('FluidLogsController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FluidLogsController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: FluidLogsService, useValue: serviceStub },
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
      url: `/api/vehicles/${vehicleId}/fluid-logs`,
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/vehicles/:vehicleId/fluid-logs lists fluid logs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/fluid-logs`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([sampleFluidLog]);
    expect(calls).toEqual([{ method: 'list', args: [userId, vehicleId] }]);
  });

  it('GET /api/vehicles/:vehicleId/fluid-logs rejects non-uuid vehicleId with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/vehicles/not-a-uuid/fluid-logs',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('GET /api/vehicles/:vehicleId/fluid-logs/:id returns the fluid log', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/fluid-logs/${existingId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(sampleFluidLog);
    expect(calls).toEqual([{ method: 'getOwnedOrThrow', args: [userId, vehicleId, existingId] }]);
  });

  it('GET /api/vehicles/:vehicleId/fluid-logs/:id surfaces 404 from service', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/fluid-logs/${missingId}`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND', message: 'Fluid log not found' });
  });

  it('POST /api/vehicles/:vehicleId/fluid-logs takes owner from session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/fluid-logs`,
      payload: {
        changeDate: '2026-04-01',
        mileage: 50000,
        fluidType: 'engine_oil',
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[0]).toBe(userId);
    expect(createCall?.args[1]).toBe(vehicleId);
  });

  it('POST /api/vehicles/:vehicleId/fluid-logs allows omitting cost and quantity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/fluid-logs`,
      payload: {
        changeDate: '2026-04-01',
        mileage: 50000,
        fluidType: 'coolant',
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[2]).not.toHaveProperty('cost');
    expect(createCall?.args[2]).not.toHaveProperty('quantityLiters');
  });

  it('POST /api/vehicles/:vehicleId/fluid-logs rejects invalid body with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/fluid-logs`,
      payload: { changeDate: '2026-04-01' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects mileage < 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/fluid-logs`,
      payload: { changeDate: '2026-04-01', mileage: -1, fluidType: 'engine_oil' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST rejects quantityLiters <= 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/fluid-logs`,
      payload: {
        changeDate: '2026-04-01',
        mileage: 50000,
        fluidType: 'engine_oil',
        quantityLiters: 0,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST rejects negative cost', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/fluid-logs`,
      payload: {
        changeDate: '2026-04-01',
        mileage: 50000,
        fluidType: 'engine_oil',
        cost: -1,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('POST rejects unknown fluidType with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/fluid-logs`,
      payload: { changeDate: '2026-04-01', mileage: 50000, fluidType: 'nope' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('PATCH /api/vehicles/:vehicleId/fluid-logs/:id forwards update to service', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${vehicleId}/fluid-logs/${existingId}`,
      payload: { cost: 50 },
    });

    expect(res.statusCode).toBe(200);
    const updateCall = calls.find((c) => c.method === 'update');
    expect(updateCall?.args[0]).toBe(userId);
    expect(updateCall?.args[1]).toBe(vehicleId);
    expect(updateCall?.args[2]).toBe(existingId);
    expect(updateCall?.args[3]).toMatchObject({ cost: 50 });
  });

  it('DELETE /api/vehicles/:vehicleId/fluid-logs/:id returns 204', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/vehicles/${vehicleId}/fluid-logs/${existingId}`,
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    expect(calls).toEqual([{ method: 'remove', args: [userId, vehicleId, existingId] }]);
  });
});
