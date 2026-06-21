import {
  chargerTypes,
  chargingSessions,
  createDb,
  fuelLogs,
  users,
  vehicles,
  type Db,
} from '@carnotea/db';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AUTH } from '../auth/auth.constants.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { DB } from '../db/db.constants.js';

import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';

// Exercises the real Drizzle queries, ownership scoping, fuel-type code⇄id
// mapping, and unique-conflict handling against a live Postgres. Skipped when
// DATABASE_URL is absent (CI without a database / a sandbox without Docker);
// run it locally with the docker-compose Postgres up and migrations applied.
const databaseUrl = process.env.DATABASE_URL;

interface VehicleResponse {
  id: string;
  brand: string;
  fuelType: string;
  currentMileage: number;
  currencyCode: string;
}

describe.skipIf(!databaseUrl)('Vehicles CRUD (DB integration)', () => {
  let app: NestFastifyApplication;
  let db: Db;
  let ownerId: string;
  let otherId: string;
  let actingUserId: string;
  let createdId: string;
  let chargingVehicleId: string;

  const stamp = Date.now();
  const vin = 'WVWZZZ1KZAW000001';

  const authStub = {
    api: {
      getSession: (): Promise<{ user: { id: string; email: string } }> =>
        Promise.resolve({ user: { id: actingUserId, email: 'acting@example.com' } }),
    },
  };

  beforeAll(async () => {
    db = createDb(databaseUrl as string);

    const seeded = await db
      .insert(users)
      .values([
        {
          firstName: 'Owner',
          lastName: 'One',
          email: `t020-owner-${stamp.toString()}@example.com`,
        },
        {
          firstName: 'Other',
          lastName: 'Two',
          email: `t020-other-${stamp.toString()}@example.com`,
        },
      ])
      .returning({ id: users.id });
    ownerId = seeded[0]?.id ?? '';
    otherId = seeded[1]?.id ?? '';
    actingUserId = ownerId;

    const moduleRef = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [
        VehiclesService,
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

  it('POST /api/vehicles creates a vehicle with DB defaults and the mapped fuel type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      payload: {
        brand: 'Volkswagen',
        model: 'Golf',
        productionYear: 2019,
        fuelType: 'diesel',
        vin,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<VehicleResponse>();
    createdId = body.id;
    expect(body.brand).toBe('Volkswagen');
    expect(body.fuelType).toBe('diesel');
    expect(body.currentMileage).toBe(0);
    expect(body.currencyCode).toBe('EUR');
  });

  it('GET /api/vehicles lists only the owner vehicles', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/vehicles' });

    expect(res.statusCode).toBe(200);
    const body = res.json<VehicleResponse[]>();
    expect(body.map((v) => v.id)).toContain(createdId);
  });

  it('GET /api/vehicles/:id returns the owned vehicle', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/vehicles/${createdId}` });

    expect(res.statusCode).toBe(200);
    expect(res.json<VehicleResponse>().id).toBe(createdId);
  });

  it('PATCH /api/vehicles/:id updates fields and remaps the fuel type', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${createdId}`,
      payload: { brand: 'Audi', fuelType: 'petrol' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<VehicleResponse>();
    expect(body.brand).toBe('Audi');
    expect(body.fuelType).toBe('petrol');
  });

  it('rejects changing a vehicle with fuel logs to electric', async () => {
    await db.insert(fuelLogs).values({
      vehicleId: createdId,
      fuelDate: '2026-01-20',
      mileage: 50_500,
      liters: '40',
      pricePerLiter: '1.80',
      totalCost: '72',
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${createdId}`,
      payload: { fuelType: 'electric' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      issues: [{ path: ['fuelType'] }],
    });
  });

  it('rejects changing a vehicle with charging sessions to an ICE-only fuel type', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      payload: {
        brand: 'Tesla',
        model: 'Model 3',
        productionYear: 2022,
        fuelType: 'electric',
      },
    });
    expect(created.statusCode).toBe(201);
    chargingVehicleId = created.json<VehicleResponse>().id;

    const chargerType = await db.select({ id: chargerTypes.id }).from(chargerTypes).limit(1);
    const chargerTypeId = chargerType.at(0)?.id;
    if (chargerTypeId === undefined) {
      throw new Error('Expected charger_types seed data to exist');
    }

    await db.insert(chargingSessions).values({
      vehicleId: chargingVehicleId,
      chargeDate: '2026-01-20',
      mileage: 12_000,
      energyKwh: '20',
      pricePerKwh: '0.30',
      totalCost: '6',
      chargerTypeId,
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/vehicles/${chargingVehicleId}`,
      payload: { fuelType: 'petrol' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: 'VALIDATION_ERROR',
      issues: [{ path: ['fuelType'] }],
    });
  });

  it('hides another user vehicle behind a 404 (never 403, never leak existence)', async () => {
    actingUserId = otherId;
    try {
      const get = await app.inject({ method: 'GET', url: `/api/vehicles/${createdId}` });
      expect(get.statusCode).toBe(404);

      const patch = await app.inject({
        method: 'PATCH',
        url: `/api/vehicles/${createdId}`,
        payload: { brand: 'Stolen' },
      });
      expect(patch.statusCode).toBe(404);

      const del = await app.inject({ method: 'DELETE', url: `/api/vehicles/${createdId}` });
      expect(del.statusCode).toBe(404);
    } finally {
      actingUserId = ownerId;
    }
  });

  it('returns 409 when a VIN collides with an existing vehicle', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      payload: { brand: 'Seat', model: 'Leon', productionYear: 2018, fuelType: 'petrol', vin },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'CONFLICT' });
  });

  it('DELETE /api/vehicles/:id removes the owned vehicle, then 404 on re-fetch', async () => {
    const del = await app.inject({ method: 'DELETE', url: `/api/vehicles/${createdId}` });
    expect(del.statusCode).toBe(204);

    const get = await app.inject({ method: 'GET', url: `/api/vehicles/${createdId}` });
    expect(get.statusCode).toBe(404);
  });
});
