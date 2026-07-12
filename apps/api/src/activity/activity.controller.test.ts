import { type ActivityFeedResponse, type VehiclePanel } from '@carnotea/shared';
import { NotFoundException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const notOwnedVehicleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const mockFeed: ActivityFeedResponse = {
  items: [
    {
      kind: 'charge',
      id: '22222222-2222-4222-8222-222222222222',
      vehicleId,
      occurredAt: '2026-06-25',
      mileage: 15120,
      energyKwh: 34.5,
      totalCost: 61.4,
      chargerType: 'ac_type2',
      isFullCharge: true,
      stationName: 'Green Point',
      socStartPercent: 22,
      socEndPercent: 80,
    },
    {
      kind: 'reminder',
      id: '33333333-3333-4333-8333-333333333333',
      vehicleId,
      occurredAt: '2026-06-20',
      mileage: null,
      title: 'Cabin filter',
      mode: 'recurring',
      status: 'pending',
      dueState: 'due_soon',
      dueDate: null,
      dueMileage: null,
      intervalKm: null,
      intervalMonths: 12,
      lastPerformedDate: '2025-07-01',
      lastPerformedMileage: null,
      nextDueDate: '2026-07-01',
      nextDueMileage: null,
    },
  ],
  nextCursor: 'opaque-cursor',
};

const mockPanel: VehiclePanel = {
  vehicleId,
  brand: 'Tesla',
  model: 'Model 3',
  productionYear: 2022,
  fuelType: 'electric',
  currentMileage: 15120,
  currency: 'EUR',
  energy: { kind: 'charge', socPercent: 80, rangeKm: null },
  nextService: { dueDate: '2026-07-01', dueInKm: 880, dueState: 'due_soon' },
  monthCost: { total: 61.4, prevTotal: 52.1, currency: 'EUR' },
  avgConsumption: { value: 18.2, unit: 'kwh_per_100km' },
};

let currentSession: { user: { id: string; email: string } } | null = null;
const authStub = {
  api: { getSession: (): Promise<typeof currentSession> => Promise.resolve(currentSession) },
};

const getActivityMock =
  vi.fn<
    (
      uid: string,
      vid: string,
      query: { limit: number; cursor?: string },
    ) => Promise<ActivityFeedResponse>
  >();
const getPanelMock = vi.fn<(uid: string, vid: string) => Promise<VehiclePanel>>();
const serviceStub: Pick<ActivityService, 'getActivity' | 'getPanel'> = {
  getActivity: getActivityMock,
  getPanel: getPanelMock,
};

describe('ActivityController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: ActivityService, useValue: serviceStub },
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
    currentSession = { user: { id: userId, email: 'owner@example.com' } };
    getActivityMock.mockReset();
    getPanelMock.mockReset();

    getActivityMock.mockImplementation((_uid, vid, query) => {
      if (vid === notOwnedVehicleId) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Vehicle not found' });
      }

      expect(query).toEqual({ limit: 2, cursor: 'opaque-cursor' });
      return Promise.resolve(mockFeed);
    });

    getPanelMock.mockImplementation((_uid, vid) => {
      if (vid === notOwnedVehicleId) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Vehicle not found' });
      }

      return Promise.resolve(mockPanel);
    });
  });

  it('rejects an unauthenticated activity request with 401', async () => {
    currentSession = null;

    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/activity?limit=2&cursor=opaque-cursor`,
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/vehicles/:vehicleId/activity returns the mixed activity feed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/activity?limit=2&cursor=opaque-cursor`,
    });

    expect(getActivityMock).toHaveBeenCalledWith(userId, vehicleId, {
      limit: 2,
      cursor: 'opaque-cursor',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockFeed);
  });

  it('returns 404 for another user vehicle id on activity', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${notOwnedVehicleId}/activity?limit=2&cursor=opaque-cursor`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      code: 'NOT_FOUND',
      message: 'Vehicle not found',
    });
  });

  it('rejects an invalid activity vehicle id with 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/vehicles/not-a-uuid/activity?limit=2&cursor=opaque-cursor',
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects an unauthenticated panel request with 401', async () => {
    currentSession = null;

    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/panel`,
    });

    expect(res.statusCode).toBe(401);
  });

  it('GET /api/vehicles/:vehicleId/panel returns the vehicle panel', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${vehicleId}/panel`,
    });

    expect(getPanelMock).toHaveBeenCalledWith(userId, vehicleId);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockPanel);
  });

  it('returns 404 for another user vehicle id on panel', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${notOwnedVehicleId}/panel`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      code: 'NOT_FOUND',
      message: 'Vehicle not found',
    });
  });
});
