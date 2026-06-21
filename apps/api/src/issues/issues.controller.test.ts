import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { IssuesController } from './issues.controller.js';
import { IssuesService, type IssueResponse } from './issues.service.js';

// DB-free controller test — the service is stubbed and the real AuthGuard runs
// against a stubbed better-auth session. It pins routing, auth enforcement,
// validation, and status codes.

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const existingId = '22222222-2222-4222-8222-222222222222';
const missingId = '33333333-3333-4333-8333-333333333333';

const sampleIssue: IssueResponse = {
  id: existingId,
  vehicleId,
  reportedDate: '2026-06-01',
  resolvedDate: null,
  title: 'Brake squeal',
  description: null,
  status: 'open',
  priority: 'medium',
  relatedServiceRecordId: null,
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
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
    return Promise.resolve([sampleIssue]);
  },
  getOwnedOrThrow: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'getOwnedOrThrow', args: [uid, vid, id] });
    if (id === missingId) {
      return Promise.reject(
        new NotFoundException({ code: 'NOT_FOUND', message: 'Issue not found' }),
      );
    }
    return Promise.resolve(sampleIssue);
  },
  create: (uid: string, vid: string, body: unknown) => {
    calls.push({ method: 'create', args: [uid, vid, body] });
    return Promise.resolve(sampleIssue);
  },
  update: (uid: string, vid: string, id: string, body: unknown) => {
    calls.push({ method: 'update', args: [uid, vid, id, body] });
    return Promise.resolve(sampleIssue);
  },
  remove: (uid: string, vid: string, id: string) => {
    calls.push({ method: 'remove', args: [uid, vid, id] });
    return Promise.resolve();
  },
};

describe('IssuesController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [IssuesController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: IssuesService, useValue: serviceStub },
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

    const res = await app.inject({ method: 'GET', url: `/api/vehicles/${vehicleId}/issues` });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/vehicles/:vehicleId/issues lists issues', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/vehicles/${vehicleId}/issues` });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([sampleIssue]);
    expect(calls).toEqual([{ method: 'list', args: [userId, vehicleId, {}] }]);
  });

  it('GET /api/vehicles/:vehicleId/issues supports status filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/issues?status=open`,
    });

    expect(res.statusCode).toBe(200);
    const listCall = calls.find((c) => c.method === 'list');
    expect(listCall?.args[2]).toMatchObject({ status: 'open' });
  });

  it('GET /api/vehicles/:vehicleId/issues supports priority filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/issues?priority=high`,
    });

    expect(res.statusCode).toBe(200);
    const listCall = calls.find((c) => c.method === 'list');
    expect(listCall?.args[2]).toMatchObject({ priority: 'high' });
  });

  it('GET /api/vehicles/:vehicleId/issues rejects non-uuid vehicleId with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/vehicles/not-a-uuid/issues' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('GET /api/vehicles/:vehicleId/issues/:id returns the issue', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/issues/${existingId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(sampleIssue);
    expect(calls).toEqual([{ method: 'getOwnedOrThrow', args: [userId, vehicleId, existingId] }]);
  });

  it('GET /api/vehicles/:vehicleId/issues/:id surfaces 404 from service', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/issues/${missingId}`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND', message: 'Issue not found' });
  });

  it('POST /api/vehicles/:vehicleId/issues takes owner from session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/issues`,
      payload: {
        reportedDate: '2026-06-01',
        title: 'Check engine light',
        status: 'open',
        priority: 'high',
      },
    });

    expect(res.statusCode).toBe(201);
    const createCall = calls.find((c) => c.method === 'create');
    expect(createCall?.args[0]).toBe(userId);
    expect(createCall?.args[1]).toBe(vehicleId);
  });

  it('POST rejects invalid body with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/issues`,
      payload: { title: 'Missing required fields' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects unknown status with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/issues`,
      payload: {
        reportedDate: '2026-06-01',
        title: 'Test',
        status: 'nope',
        priority: 'medium',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects unknown priority with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/issues`,
      payload: {
        reportedDate: '2026-06-01',
        title: 'Test',
        status: 'open',
        priority: 'urgent',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects resolved without resolvedDate with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/issues`,
      payload: {
        reportedDate: '2026-06-01',
        title: 'Fixed',
        status: 'resolved',
        priority: 'low',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects resolvedDate before reportedDate with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/issues`,
      payload: {
        reportedDate: '2026-06-10',
        resolvedDate: '2026-06-01',
        title: 'Bad date',
        status: 'resolved',
        priority: 'medium',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('POST rejects non-resolved status with resolvedDate set', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/vehicles/${vehicleId}/issues`,
      payload: {
        reportedDate: '2026-06-01',
        resolvedDate: '2026-06-05',
        title: 'Invalid',
        status: 'open',
        priority: 'medium',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(calls).toEqual([]);
  });

  it('PATCH /api/vehicles/:vehicleId/issues/:id forwards update to service', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${vehicleId}/issues/${existingId}`,
      payload: { title: 'Updated title' },
    });

    expect(res.statusCode).toBe(200);
    const updateCall = calls.find((c) => c.method === 'update');
    expect(updateCall?.args[0]).toBe(userId);
    expect(updateCall?.args[1]).toBe(vehicleId);
    expect(updateCall?.args[2]).toBe(existingId);
    expect(updateCall?.args[3]).toMatchObject({ title: 'Updated title' });
  });

  it('DELETE /api/vehicles/:vehicleId/issues/:id returns 204', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/vehicles/${vehicleId}/issues/${existingId}`,
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    expect(calls).toEqual([{ method: 'remove', args: [userId, vehicleId, existingId] }]);
  });
});
