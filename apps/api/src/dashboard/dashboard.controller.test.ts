import {
  type DashboardOverview,
  type ExpenseByCategory,
  type MonthlySpend,
  type UpcomingReminder,
} from '@carnotea/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';

import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

const userId = '11111111-1111-4111-8111-111111111111';

const mockOverview: DashboardOverview = {
  totalVehicles: 2,
  totalExpenses: 4500.5,
  totalFuelCost: 1800.0,
  avgFuelConsumption: 7.85,
  currency: 'EUR',
};

const mockCategoryItems: ExpenseByCategory[] = [
  { category: 'fuel', total: 1800, count: 12 },
  { category: 'service', total: 1200, count: 3 },
  { category: 'insurance', total: 800, count: 2 },
  { category: 'parts', total: 500.5, count: 4 },
  { category: 'other', total: 200, count: 1 },
];

const mockMonthlySpend: MonthlySpend[] = [
  { year: 2025, month: 7, total: 350.0, currency: 'EUR' },
  { year: 2025, month: 8, total: 420.0, currency: 'EUR' },
  { year: 2025, month: 9, total: 380.0, currency: 'EUR' },
];

const mockUpcomingReminders: UpcomingReminder[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    vehicleId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Oil change overdue',
    description: null,
    mode: 'recurring',
    dueDate: null,
    dueMileage: null,
    intervalKm: 15000,
    intervalMonths: 12,
    lastPerformedDate: '2025-06-10',
    lastPerformedMileage: 70000,
    nextDueDate: '2026-06-10',
    nextDueMileage: 85000,
    status: 'pending',
    dueState: 'overdue',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    vehicleId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    title: 'Tire rotation due soon',
    description: 'Rotate all 4 tires',
    mode: 'one_off',
    dueDate: '2026-07-05',
    dueMileage: null,
    intervalKm: null,
    intervalMonths: null,
    lastPerformedDate: null,
    lastPerformedMileage: null,
    nextDueDate: '2026-07-05',
    nextDueMileage: null,
    status: 'pending',
    dueState: 'due_soon',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
];

let currentSession: { user: { id: string; email: string } } | null = null;
const authStub = {
  api: { getSession: (): Promise<typeof currentSession> => Promise.resolve(currentSession) },
};

const serviceStub = {
  getOverview: (_uid: string) => Promise.resolve(mockOverview),
  getExpensesByCategory: (_uid: string) =>
    Promise.resolve({ items: mockCategoryItems, currency: 'EUR' }),
  getMonthlySpend: (_uid: string) => Promise.resolve(mockMonthlySpend),
  getUpcomingReminders: (_uid: string) => Promise.resolve(mockUpcomingReminders),
};

describe('DashboardController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: DashboardService, useValue: serviceStub },
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
  });

  it('rejects an unauthenticated request with 401', async () => {
    currentSession = null;

    const res = await app.inject({ method: 'GET', url: '/api/dashboard/overview' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/dashboard/overview returns overview', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard/overview' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockOverview);
  });

  it('GET /api/dashboard/expenses-by-category returns categories', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard/expenses-by-category' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: mockCategoryItems, currency: 'EUR' });
  });

  it('GET /api/dashboard/monthly-spend returns monthly series', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard/monthly-spend' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockMonthlySpend);
  });

  it('GET /api/dashboard/upcoming-reminders returns reminders', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard/upcoming-reminders' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(mockUpcomingReminders);
  });
});
