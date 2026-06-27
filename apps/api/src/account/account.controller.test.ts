import {
  chargingSessions,
  expenses,
  fuelLogs,
  issues,
  mileageReadings,
  reminders,
  serviceRecords,
  vehicles,
  type Db,
} from '@carnotea/db';
import type { users } from '@carnotea/db';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { DB } from '../db/db.constants.js';

import { AccountController } from './account.controller.js';
import { type AccountExport } from './account.schema.js';

const userId = '11111111-1111-4111-8111-111111111111';

const baseProfile = {
  id: userId,
  email: 'jan@example.com',
  firstName: 'Jan',
  lastName: 'Kowalski',
  localePref: 'en',
  unitsPref: 'metric',
  currencyPref: 'EUR',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
} satisfies typeof users.$inferSelect;

let currentSession: { user: { id: string; email: string } } | null = null;
let storedProfile: typeof users.$inferSelect | undefined;
let lastTablePassed: unknown = null;

const authStub = {
  api: {
    getSession: (): Promise<typeof currentSession> => Promise.resolve(currentSession),
  },
};

const dbStub = {
  query: {
    users: {
      findFirst: () => Promise.resolve(storedProfile),
    },
  },
  select: () => {
    const chain = {
      from: (table: unknown) => {
        lastTablePassed = table;
        return chain;
      },
      innerJoin: () => chain,
      where: () => chain,
      then: (resolve: (val: unknown) => void) => {
        if (lastTablePassed === vehicles) {
          resolve([
            {
              id: '22222222-2222-4222-8222-222222222222',
              brand: 'Toyota',
              model: 'Corolla',
              generation: null,
              productionYear: 2020,
              engine: null,
              fuelType: 'petrol',
              vin: null,
              registrationNumber: null,
              currentMileage: 1000,
              currencyCode: 'EUR',
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            },
          ]);
        } else if (lastTablePassed === fuelLogs) {
          resolve([
            {
              id: '44444444-4444-4444-8444-444444444444',
              vehicleId: '22222222-2222-4222-8222-222222222222',
              fuelDate: '2026-01-02',
              mileage: 500,
              liters: '30.00',
              pricePerLiter: '1.50',
              totalCost: '45.00',
              stationName: 'Shell',
              isFullTank: true,
              createdAt: new Date('2026-01-02T00:00:00.000Z'),
            },
          ]);
        } else if (lastTablePassed === chargingSessions) {
          resolve([
            {
              id: '55555555-5555-5555-8555-555555555555',
              vehicleId: '22222222-2222-4222-8222-222222222222',
              chargeDate: '2026-01-03',
              mileage: 600,
              energyKwh: '20.00',
              pricePerKwh: '0.30',
              totalCost: '6.00',
              chargerType: 'ccs',
              socStartPercent: 10,
              socEndPercent: 80,
              stationName: 'Tesla',
              isFullCharge: true,
              createdAt: new Date('2026-01-03T00:00:00.000Z'),
            },
          ]);
        } else if (lastTablePassed === mileageReadings) {
          resolve([
            {
              id: '66666666-6666-6666-8666-666666666666',
              vehicleId: '22222222-2222-4222-8222-222222222222',
              readingDate: '2026-01-04',
              mileage: 700,
              sourceType: 'manual',
              sourceId: null,
              note: 'Initial',
              createdAt: new Date('2026-01-04T00:00:00.000Z'),
              updatedAt: new Date('2026-01-04T00:00:00.000Z'),
            },
          ]);
        } else if (lastTablePassed === serviceRecords) {
          resolve([
            {
              id: '77777777-7777-7777-8777-777777777777',
              vehicleId: '22222222-2222-4222-8222-222222222222',
              serviceDate: '2026-01-05',
              mileage: 800,
              title: 'Oil change',
              description: 'Synthetic oil',
              laborCost: '50.00',
              totalCost: '120.00',
              workshopName: 'AutoFix',
              createdAt: new Date('2026-01-05T00:00:00.000Z'),
              updatedAt: new Date('2026-01-05T00:00:00.000Z'),
            },
          ]);
        } else if (lastTablePassed === issues) {
          resolve([
            {
              id: '88888888-8888-8888-8888-888888888888',
              vehicleId: '22222222-2222-4222-8222-222222222222',
              reportedDate: '2026-01-06',
              resolvedDate: null,
              title: 'Squeaky brakes',
              description: 'Front left',
              status: 'open',
              priority: 'medium',
              relatedServiceRecordId: null,
              createdAt: new Date('2026-01-06T00:00:00.000Z'),
              updatedAt: new Date('2026-01-06T00:00:00.000Z'),
            },
          ]);
        } else if (lastTablePassed === expenses) {
          resolve([
            {
              id: '99999999-9999-9999-9999-999999999999',
              vehicleId: '22222222-2222-4222-8222-222222222222',
              category: 'fuel',
              expenseDate: '2026-01-07',
              amount: '45.00',
              description: 'Fuel refuel',
              sourceType: 'fuel_log',
              sourceId: '44444444-4444-4444-8444-444444444444',
              createdAt: new Date('2026-01-07T00:00:00.000Z'),
              updatedAt: new Date('2026-01-07T00:00:00.000Z'),
            },
          ]);
        } else if (lastTablePassed === reminders) {
          resolve([
            {
              id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              vehicleId: '22222222-2222-4222-8222-222222222222',
              title: 'Next Service',
              description: 'Routine maintenance',
              dueDate: '2026-06-01',
              dueMileage: 10000,
              statusCode: 'pending',
              notifiedAt: null,
              createdAt: new Date('2026-01-08T00:00:00.000Z'),
              updatedAt: new Date('2026-01-08T00:00:00.000Z'),
            },
          ]);
        } else {
          resolve([]);
        }
      },
    };
    return chain as unknown as ReturnType<Db['select']>;
  },
  transaction: (callback: (tx: unknown) => Promise<unknown>) => callback(dbStub),
  delete: () => {
    const chain = {
      where: () => Promise.resolve(),
    };
    return chain as unknown as ReturnType<Db['delete']>;
  },
} as unknown as Db;

describe('AccountController', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: DB, useValue: dbStub },
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
    currentSession = { user: { id: userId, email: 'jan@example.com' } };
    storedProfile = { ...baseProfile };
    lastTablePassed = null;
  });

  describe('GET /api/me/export', () => {
    it('returns 401 for an unauthenticated request', async () => {
      currentSession = null;

      const res = await app.inject({ method: 'GET', url: '/api/me/export' });

      expect(res.statusCode).toBe(401);
    });

    it('returns the complete data export envelope', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/me/export' });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="carnotea-export.json"',
      );

      const json: AccountExport = res.json();
      expect(json).toHaveProperty('exportedAt');
      expect(json.version).toBe(1);
      expect(json.profile.firstName).toBe('Jan');
      expect(json.vehicles).toHaveLength(1);
      expect(json.fuelLogs).toHaveLength(1);
      expect(json.chargingSessions).toHaveLength(1);
      expect(json.mileageReadings).toHaveLength(1);
      expect(json.serviceRecords).toHaveLength(1);
      expect(json.issues).toHaveLength(1);
      expect(json.expenses).toHaveLength(1);
      expect(json.reminders).toHaveLength(1);
    });
  });

  describe('DELETE /api/me', () => {
    it('returns 401 for an unauthenticated request', async () => {
      currentSession = null;

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/me',
        payload: { confirmation: 'jan@example.com' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('rejects confirmation with wrong email address', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/me',
        payload: { confirmation: 'wrong@example.com' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Confirmation does not match your email address',
      });
    });

    it('deletes account successfully with matching confirmation', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/me',
        payload: { confirmation: 'jan@example.com' },
      });

      expect(res.statusCode).toBe(204);
      expect(res.body).toBe('');
    });
  });
});
