import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { ServiceRecordsController } from './service-records.controller.js';
import { ServiceRecordsService, type ServiceRecordResponse } from './service-records.service.js';

// DB-free controller test — the service is stubbed and the real AuthGuard runs
// against a stubbed better-auth session. It pins routing, auth enforcement,
// validation, status codes, and that totalCost is never read from the body.

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const existingId = '22222222-2222-4222-8222-222222222222';
const missingId = '33333333-3333-4333-8333-333333333333';

const partLine = {
  id: '44444444-4444-4444-8444-444444444444',
  serviceRecordId: existingId,
  partId: '55555555-5555-4555-8555-555555555555',
  name: 'Oil filter',
  manufacturer: 'Mann',
  partNumber: 'HU 711/6 x',
  quantity: 1,
  unitPrice: 12.99,
  totalPrice: 12.99,
};

const sampleRecord: ServiceRecordResponse = {
  id: existingId,
  vehicleId,
  serviceDate: '2026-05-01',
  mileage: 90000,
  title: 'Oil change',
  description: null,
  laborCost: 50,
  totalCost: 62.99,
  workshopName: null,
  parts: [partLine],
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
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
    return Promise.resolve([sampleRecord]);
  },
  getOwnedOrThrow: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'getOwnedOrThrow', args: [uid, vid, id] });
    if (id === missingId) {
      return Promise.reject(
        new NotFoundException({ code: 'NOT_FOUND', message: 'Service record not found' }),
      );
    }
    return Promise.resolve(sampleRecord);
  },
  create: (uid: string, vid: string, body: unknown) => {
    calls.push({ method: 'create', args: [uid, vid, body] });
    return Promise.resolve(sampleRecord);
  },
  update: (uid: string, vid: string, id: string, body: unknown) => {
    calls.push({ method: 'update', args: [uid, vid, id, body] });
    return Promise.resolve(sampleRecord);
  },
  remove: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'remove', args: [uid, vid, id] });
    return Promise.resolve();
  },
};

describe('ServiceRecordsController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ServiceRecordsController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: ServiceRecordsService, useValue: serviceStub },
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
      url: `/api/vehicles/${vehicleId}/service-records`,
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/vehicles/:vehicleId/service-records lists records', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/service-records`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([sampleRecord]);
    expect(calls).toEqual([{ method: 'list', args: [userId, vehicleId] }]);
  });

  it('GET /api/vehicles/:vehicleId/service-records rejects non-uuid vehicleId with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/vehicles/not-a-uuid/service-records',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('GET /api/vehicles/:vehicleId/service-records/:id returns the record', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/service-records/${existingId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(sampleRecord);
    expect(calls).toEqual([{ method: 'getOwnedOrThrow', args: [userId, vehicleId, existingId] }]);
  });

  it('GET /api/vehicles/:vehicleId/service-records/:id surfaces 404 from service', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/service-records/${missingId}`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND', message: 'Service record not found' });
  });

  it('POST /api/vehicles/:vehicleId/service-records takes owner from session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/service-records`,
      payload: {
        serviceDate: '2026-05-01',
        mileage: 90000,
        title: 'Oil change',
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[0]).toBe(userId);
    expect(createCall?.args[1]).toBe(vehicleId);
    expect(createCall?.args[2]).not.toHaveProperty('totalCost');
  });

  it('POST /api/vehicles/:vehicleId/service-records ignores totalCost in body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/service-records`,
      payload: {
        serviceDate: '2026-05-01',
        mileage: 90000,
        title: 'Oil change',
        totalCost: 999,
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[2]).not.toHaveProperty('totalCost');
  });

  it('POST /api/vehicles/:vehicleId/service-records with parts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/service-records`,
      payload: {
        serviceDate: '2026-05-01',
        mileage: 90000,
        title: 'Oil change',
        laborCost: 50,
        parts: [
          {
            name: 'Oil filter',
            manufacturer: 'Mann',
            partNumber: 'HU 711/6 x',
            quantity: 1,
            unitPrice: 12.99,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[2]).toHaveProperty('parts');
  });

  it('POST /api/vehicles/:vehicleId/service-records rejects invalid body with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/service-records`,
      payload: { serviceDate: '2026-05-01' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects missing title', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/service-records`,
      payload: { serviceDate: '2026-05-01', mileage: 90000 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('PATCH /api/vehicles/:vehicleId/service-records/:id forwards update to service', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${vehicleId}/service-records/${existingId}`,
      payload: { title: 'Updated title' },
    });

    expect(res.statusCode).toBe(200);
    const updateCall = calls.find((c) => c.method === 'update');
    expect(updateCall?.args[0]).toBe(userId);
    expect(updateCall?.args[1]).toBe(vehicleId);
    expect(updateCall?.args[2]).toBe(existingId);
    expect(updateCall?.args[3]).toMatchObject({ title: 'Updated title' });
  });

  it('DELETE /api/vehicles/:vehicleId/service-records/:id returns 204', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/vehicles/${vehicleId}/service-records/${existingId}`,
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    expect(calls).toEqual([{ method: 'remove', args: [userId, vehicleId, existingId] }]);
  });
});
