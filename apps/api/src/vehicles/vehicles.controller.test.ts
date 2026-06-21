import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';

// DB-free controller test: the service is stubbed and the real AuthGuard runs
// against a stubbed better-auth session. It pins routing, auth enforcement,
// validation, status codes, and that the owner id comes from the session — never
// the body. End-to-end CRUD against a real database lives in the integration test.

const userId = '11111111-1111-4111-8111-111111111111';
const existingId = '22222222-2222-4222-8222-222222222222';
const missingId = '33333333-3333-4333-8333-333333333333';

const sampleVehicle = {
  id: existingId,
  brand: 'Toyota',
  model: 'Corolla',
  generation: null,
  productionYear: 2020,
  engine: null,
  fuelType: 'petrol',
  vin: null,
  registrationNumber: null,
  currentMileage: 0,
  currencyCode: 'EUR',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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
  list: (uid: string) => {
    calls.push({ method: 'list', args: [uid] });
    return Promise.resolve([sampleVehicle]);
  },
  getOwnedOrThrow: (uid: string, id: string) => {
    calls.push({ method: 'getOwnedOrThrow', args: [uid, id] });
    if (id === missingId) {
      return Promise.reject(
        new NotFoundException({ code: 'NOT_FOUND', message: 'Vehicle not found' }),
      );
    }
    return Promise.resolve(sampleVehicle);
  },
  create: (uid: string, body: unknown) => {
    calls.push({ method: 'create', args: [uid, body] });
    return Promise.resolve(sampleVehicle);
  },
  update: (uid: string, id: string, body: unknown) => {
    calls.push({ method: 'update', args: [uid, id, body] });
    return Promise.resolve(sampleVehicle);
  },
  remove: (uid: string, id: string) => {
    calls.push({ method: 'remove', args: [uid, id] });
    return Promise.resolve();
  },
};

describe('VehiclesController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: VehiclesService, useValue: serviceStub },
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

    const res = await app.inject({ method: 'GET', url: '/api/vehicles' });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/vehicles lists the session user vehicles', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/vehicles' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([sampleVehicle]);
    expect(calls).toEqual([{ method: 'list', args: [userId] }]);
  });

  it('GET /api/vehicles/:id returns the vehicle scoped to the session user', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/vehicles/${existingId}` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(sampleVehicle);
    expect(calls).toEqual([{ method: 'getOwnedOrThrow', args: [userId, existingId] }]);
  });

  it('GET /api/vehicles/:id surfaces a service 404 as the ApiError envelope', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/vehicles/${missingId}` });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND', message: 'Vehicle not found' });
  });

  it('GET /api/vehicles/:id rejects a non-uuid id with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/vehicles/not-a-uuid' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST /api/vehicles takes the owner from the session, not the body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      payload: {
        userId: 'attacker-supplied',
        brand: 'Toyota',
        model: 'Corolla',
        productionYear: 2020,
        fuelType: 'petrol',
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[0]).toBe(userId);
    expect(createCall?.args[1]).not.toHaveProperty('userId');
  });

  it('POST /api/vehicles rejects an invalid body with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      payload: { model: 'Corolla' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('PATCH /api/vehicles/:id forwards the parsed update scoped to the session user', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${existingId}`,
      payload: { brand: 'Honda' },
    });

    expect(res.statusCode).toBe(200);
    const updateCall = calls.find((c) => c.method === 'update');
    expect(updateCall?.args[0]).toBe(userId);
    expect(updateCall?.args[1]).toBe(existingId);
    expect(updateCall?.args[2]).toMatchObject({ brand: 'Honda' });
  });

  it('DELETE /api/vehicles/:id returns 204 and calls the service', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/api/vehicles/${existingId}` });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    expect(calls).toEqual([{ method: 'remove', args: [userId, existingId] }]);
  });
});
