import {
  chargerTypes,
  chargingSessions,
  createDb,
  expenseCategories,
  expenses,
  fuelTypes,
  issuePriorities,
  issueStatuses,
  issues,
  reminderStatuses,
  reminders,
  serviceRecords,
  users,
  vehicles,
  type Db,
} from '@carnotea/db';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { DB } from '../db/db.constants.js';

import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';

const databaseUrl = process.env.DATABASE_URL;
const baseDate = new Date(Date.UTC(2026, 6, 20, 12, 0, 0, 0));

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() - days);
  return toYmd(date);
}

function isoDaysAgo(days: number): Date {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(10, 0, 0, 0);
  return date;
}

function realDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return toYmd(date);
}

function monthDate(offsetMonths: number, day: number): string {
  return toYmd(
    new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + offsetMonths, day)),
  );
}

describe.skipIf(!databaseUrl)('Activity endpoints (DB integration)', () => {
  let app: NestFastifyApplication;
  let db: Db;
  let ownerId: string;
  let otherId: string;
  let actingUserId: string;
  let evVehicleId: string;
  let iceVehicleId: string;
  let emptyVehicleId: string;
  let otherVehicleId: string;

  const stamp = Date.now();

  const authStub = {
    api: {
      getSession: (): Promise<{ user: { id: string; email: string } }> =>
        Promise.resolve({ user: { id: actingUserId, email: 'acting@example.com' } }),
    },
  };

  beforeAll(async () => {
    db = createDb(databaseUrl as string);

    const [
      electricFuelType,
      petrolFuelType,
      acType2,
      serviceCategory,
      openStatus,
      highPriority,
      pendingStatus,
    ] = await Promise.all([
      db.query.fuelTypes.findFirst({ where: eq(fuelTypes.code, 'electric') }),
      db.query.fuelTypes.findFirst({ where: eq(fuelTypes.code, 'petrol') }),
      db.query.chargerTypes.findFirst({ where: eq(chargerTypes.code, 'ac_type2') }),
      db.query.expenseCategories.findFirst({ where: eq(expenseCategories.code, 'service') }),
      db.query.issueStatuses.findFirst({ where: eq(issueStatuses.code, 'open') }),
      db.query.issuePriorities.findFirst({ where: eq(issuePriorities.code, 'high') }),
      db.query.reminderStatuses.findFirst({ where: eq(reminderStatuses.code, 'pending') }),
    ]);

    if (
      !electricFuelType ||
      !petrolFuelType ||
      !acType2 ||
      !serviceCategory ||
      !openStatus ||
      !highPriority ||
      !pendingStatus
    ) {
      throw new Error('Expected lookup seed data to exist for activity integration tests');
    }

    const seededUsers = await db
      .insert(users)
      .values([
        {
          firstName: 'Owner',
          lastName: 'One',
          email: `t071-owner-${stamp.toString()}@example.com`,
        },
        {
          firstName: 'Other',
          lastName: 'Two',
          email: `t071-other-${stamp.toString()}@example.com`,
        },
      ])
      .returning({ id: users.id });

    ownerId = seededUsers[0]?.id ?? '';
    otherId = seededUsers[1]?.id ?? '';
    actingUserId = ownerId;

    const seededVehicles = await db
      .insert(vehicles)
      .values([
        {
          userId: ownerId,
          brand: 'Tesla',
          model: 'Model 3',
          productionYear: 2022,
          fuelTypeId: electricFuelType.id,
          currentMileage: 12000,
        },
        {
          userId: ownerId,
          brand: 'Volkswagen',
          model: 'Golf',
          productionYear: 2019,
          fuelTypeId: petrolFuelType.id,
          currentMileage: 50000,
        },
        {
          userId: ownerId,
          brand: 'Skoda',
          model: 'Fabia',
          productionYear: 2016,
          fuelTypeId: petrolFuelType.id,
          currentMileage: 150000,
        },
        {
          userId: otherId,
          brand: 'Ford',
          model: 'Focus',
          productionYear: 2018,
          fuelTypeId: petrolFuelType.id,
          currentMileage: 90000,
        },
      ])
      .returning({ id: vehicles.id });

    evVehicleId = seededVehicles[0]?.id ?? '';
    iceVehicleId = seededVehicles[1]?.id ?? '';
    emptyVehicleId = seededVehicles[2]?.id ?? '';
    otherVehicleId = seededVehicles[3]?.id ?? '';

    await db.insert(chargingSessions).values([
      {
        vehicleId: evVehicleId,
        chargeDate: daysAgo(20),
        mileage: 11700,
        energyKwh: '40',
        pricePerKwh: '0.30',
        totalCost: '12.00',
        chargerTypeId: acType2.id,
        socStartPercent: 20,
        socEndPercent: 70,
        isFullCharge: true,
      },
      {
        vehicleId: evVehicleId,
        chargeDate: daysAgo(5),
        mileage: 12000,
        energyKwh: '45',
        pricePerKwh: '0.40',
        totalCost: '18.00',
        chargerTypeId: acType2.id,
        socStartPercent: 30,
        socEndPercent: 82,
        stationName: 'Green Point',
        isFullCharge: true,
      },
    ]);

    const [serviceRecord] = await db
      .insert(serviceRecords)
      .values({
        vehicleId: evVehicleId,
        serviceDate: daysAgo(6),
        mileage: 11950,
        title: 'Tire rotation',
        laborCost: '40.00',
        totalCost: '120.00',
        workshopName: 'Main Garage',
      })
      .returning({ id: serviceRecords.id });

    if (!serviceRecord) {
      throw new Error('Expected service record insert to return an id');
    }

    await db.insert(expenses).values([
      {
        vehicleId: evVehicleId,
        categoryId: serviceCategory.id,
        expenseDate: daysAgo(7),
        amount: '80.00',
        description: 'Cabin filter',
        sourceType: 'manual',
      },
      {
        vehicleId: evVehicleId,
        categoryId: serviceCategory.id,
        expenseDate: monthDate(-1, 12),
        amount: '30.00',
        description: 'Washer fluid',
        sourceType: 'manual',
      },
    ]);

    await db.insert(issues).values({
      vehicleId: evVehicleId,
      reportedDate: daysAgo(8),
      title: 'TPMS warning',
      statusId: openStatus.id,
      priorityId: highPriority.id,
    });

    await db.insert(reminders).values({
      vehicleId: evVehicleId,
      title: 'Annual inspection',
      dueDate: realDaysAgo(1),
      dueMileage: 12500,
      statusId: pendingStatus.id,
      createdAt: isoDaysAgo(9),
      updatedAt: isoDaysAgo(9),
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        ActivityService,
        AuthGuard,
        { provide: AUTH, useValue: authStub },
        { provide: DB, useValue: db },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await db.delete(vehicles).where(inArray(vehicles.userId, [ownerId, otherId]));
    await db.delete(users).where(inArray(users.id, [ownerId, otherId]));
    await app.close();
  });

  it('GET /api/vehicles/:vehicleId/activity returns a mixed feed sorted newest-first', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${evVehicleId}/activity?limit=10`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ items: Array<{ kind: string }>; nextCursor: string | null }>();
    expect(body.items.map((item) => item.kind)).toEqual([
      'charge',
      'service',
      'expense',
      'issue',
      'reminder',
      'charge',
      'expense',
    ]);
    expect(body.nextCursor).toBeNull();
  });

  it('GET /api/vehicles/:vehicleId/activity paginates with a stable cursor', async () => {
    const page1 = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${evVehicleId}/activity?limit=2`,
    });

    expect(page1.statusCode).toBe(200);
    const body1 = page1.json<{ items: Array<{ id: string }>; nextCursor: string | null }>();
    expect(body1.items).toHaveLength(2);
    expect(body1.nextCursor).toBeTruthy();

    const page2 = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${evVehicleId}/activity?limit=2&cursor=${body1.nextCursor ?? ''}`,
    });

    expect(page2.statusCode).toBe(200);
    const body2 = page2.json<{ items: Array<{ id: string }>; nextCursor: string | null }>();
    expect(body2.items).toHaveLength(2);
    expect(body1.items.map((item) => item.id)).not.toEqual(body2.items.map((item) => item.id));
    expect(body2.items.some((item) => body1.items.some((first) => first.id === item.id))).toBe(
      false,
    );
  });

  it('GET /api/vehicles/:vehicleId/activity returns an empty feed for a vehicle with no events', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${emptyVehicleId}/activity?limit=10`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [], nextCursor: null });
  });

  it('GET /api/vehicles/:vehicleId/activity hides another user vehicle behind 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${otherVehicleId}/activity?limit=10`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('GET /api/vehicles/:vehicleId/panel returns EV vitals derived from live data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${evVehicleId}/panel`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      vehicleId: evVehicleId,
      brand: 'Tesla',
      energy: { kind: 'charge', socPercent: 82 },
      nextService: { dueState: 'overdue' },
      monthCost: { total: 80, prevTotal: 30, currency: 'EUR' },
      avgConsumption: { value: 15, unit: 'kwh_per_100km' },
    });
  });

  it('GET /api/vehicles/:vehicleId/panel returns null energy and reminder vitals when data is unavailable', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${iceVehicleId}/panel`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      vehicleId: iceVehicleId,
      energy: null,
      nextService: null,
      avgConsumption: null,
    });
  });

  it('GET /api/vehicles/:vehicleId/panel hides another user vehicle behind 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/vehicles/${otherVehicleId}/panel`,
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND' });
  });
});
