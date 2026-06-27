import { randomBytes, scryptSync } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../schema/index.js';

const DB_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://carnotea:carnotea_dev_password@localhost:5433/carnotea';

const TEST_EMAIL = 'test@carnotea.dev';
const TEST_PASSWORD = 'Test1234!';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password.normalize('NFKC'), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${key.toString('hex')}`;
}

function round2(a: number, b: number): string {
  return (Math.round(a * b * 100) / 100).toFixed(2);
}

async function main() {
  const client = postgres(DB_URL);
  const db = drizzle(client, { schema, casing: 'snake_case' });

  // ── Lookup tables ──────────────────────────────────────────────────────────
  const [fuelTypesRows, chargerTypesRows, expCatRows, issStatRows, issPriRows, remStatRows] =
    await Promise.all([
      db.select().from(schema.fuelTypes),
      db.select().from(schema.chargerTypes),
      db.select().from(schema.expenseCategories),
      db.select().from(schema.issueStatuses),
      db.select().from(schema.issuePriorities),
      db.select().from(schema.reminderStatuses),
    ]);

  const fuelTypeId = (code: string) => fuelTypesRows.find((r) => r.code === code)!.id;
  const chargerTypeId = (code: string) => chargerTypesRows.find((r) => r.code === code)!.id;
  const expCatId = (code: string) => expCatRows.find((r) => r.code === code)!.id;
  const issStatId = (code: string) => issStatRows.find((r) => r.code === code)!.id;
  const issPriId = (code: string) => issPriRows.find((r) => r.code === code)!.id;
  const remStatId = (code: string) => remStatRows.find((r) => r.code === code)!.id;

  // ── Idempotency guard ──────────────────────────────────────────────────────
  const existing = await db
    .select({ id: schema.authUser.id })
    .from(schema.authUser)
    .where(eq(schema.authUser.email, TEST_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Seed user ${TEST_EMAIL} already exists. Run pnpm db:reset first to reseed.`);
    await client.end();
    return;
  }

  // ── User ───────────────────────────────────────────────────────────────────
  const userId = crypto.randomUUID();

  await db.insert(schema.authUser).values({
    id: userId,
    name: 'Jan Testowy',
    email: TEST_EMAIL,
    emailVerified: true,
  });

  await db.insert(schema.authAccount).values({
    accountId: userId,
    providerId: 'credential',
    userId,
    password: hashPassword(TEST_PASSWORD),
  });

  await db.insert(schema.users).values({
    id: userId,
    firstName: 'Jan',
    lastName: 'Testowy',
    email: TEST_EMAIL,
    localePref: 'pl',
    unitsPref: 'metric',
    currencyPref: 'PLN',
  });

  console.log(`✓ User: ${TEST_EMAIL} / ${TEST_PASSWORD}`);

  // ── Vehicles ───────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const golf = (
    await db
      .insert(schema.vehicles)
      .values({
        userId,
        brand: 'Volkswagen',
        model: 'Golf',
        generation: 'VIII',
        productionYear: 2020,
        engine: '1.5 TSI 130 KM',
        fuelTypeId: fuelTypeId('petrol'),
        registrationNumber: 'KR12345',
        currentMileage: 87500,
        currencyCode: 'PLN',
      })
      .returning({ id: schema.vehicles.id })
  ).at(0)!;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const tesla = (
    await db
      .insert(schema.vehicles)
      .values({
        userId,
        brand: 'Tesla',
        model: 'Model 3',
        generation: 'Long Range',
        productionYear: 2022,
        engine: 'Dual Motor AWD',
        fuelTypeId: fuelTypeId('electric'),
        registrationNumber: 'KR98765',
        currentMileage: 42300,
        currencyCode: 'PLN',
      })
      .returning({ id: schema.vehicles.id })
  ).at(0)!;

  console.log(`✓ Vehicles: Golf ${golf.id}, Tesla ${tesla.id}`);

  // ── Fuel logs (Golf, Jan–Jun 2026) ─────────────────────────────────────────
  const fuelEntries: Array<{
    fuelDate: string;
    mileage: number;
    liters: number;
    ppl: number;
    station: string;
    full: boolean;
  }> = [
    {
      fuelDate: '2026-01-05',
      mileage: 81200,
      liters: 48.2,
      ppl: 6.89,
      station: 'Orlen',
      full: true,
    },
    { fuelDate: '2026-01-20', mileage: 81870, liters: 12.5, ppl: 6.91, station: 'BP', full: false },
    {
      fuelDate: '2026-02-03',
      mileage: 82620,
      liters: 46.8,
      ppl: 6.95,
      station: 'Shell',
      full: true,
    },
    {
      fuelDate: '2026-02-22',
      mileage: 83410,
      liters: 47.5,
      ppl: 6.88,
      station: 'Lotos',
      full: true,
    },
    {
      fuelDate: '2026-03-08',
      mileage: 84150,
      liters: 44.3,
      ppl: 6.99,
      station: 'Orlen',
      full: true,
    },
    {
      fuelDate: '2026-03-25',
      mileage: 84890,
      liters: 18.0,
      ppl: 7.02,
      station: 'Neste',
      full: false,
    },
    {
      fuelDate: '2026-04-07',
      mileage: 85580,
      liters: 46.1,
      ppl: 7.05,
      station: 'Orlen',
      full: true,
    },
    { fuelDate: '2026-04-23', mileage: 86150, liters: 45.9, ppl: 6.98, station: 'BP', full: true },
    {
      fuelDate: '2026-05-09',
      mileage: 86870,
      liters: 44.7,
      ppl: 6.92,
      station: 'Shell',
      full: true,
    },
    {
      fuelDate: '2026-05-28',
      mileage: 87500,
      liters: 43.8,
      ppl: 6.85,
      station: 'Orlen',
      full: true,
    },
  ];

  for (const e of fuelEntries) {
    await db.insert(schema.fuelLogs).values({
      vehicleId: golf.id,
      fuelDate: e.fuelDate,
      mileage: e.mileage,
      liters: e.liters.toFixed(2),
      pricePerLiter: e.ppl.toFixed(3),
      totalCost: round2(e.liters, e.ppl),
      stationName: e.station,
      isFullTank: e.full,
    });
  }

  console.log(`✓ Fuel logs: ${fuelEntries.length} entries`);

  // ── Charging sessions (Tesla, Jan–Jun 2026) ─────────────────────────────────
  const chargingEntries: Array<{
    chargeDate: string;
    mileage: number;
    kwh: number;
    pkwh: number;
    charger: string;
    socStart: number | null;
    socEnd: number | null;
    station: string | null;
    full: boolean;
  }> = [
    {
      chargeDate: '2026-01-04',
      mileage: 38200,
      kwh: 55.0,
      pkwh: 0.82,
      charger: 'home_socket',
      socStart: 18,
      socEnd: 90,
      station: null,
      full: false,
    },
    {
      chargeDate: '2026-01-18',
      mileage: 38850,
      kwh: 35.5,
      pkwh: 0.82,
      charger: 'home_socket',
      socStart: 30,
      socEnd: 74,
      station: null,
      full: false,
    },
    {
      chargeDate: '2026-02-02',
      mileage: 39400,
      kwh: 60.2,
      pkwh: 1.29,
      charger: 'dc_ccs',
      socStart: 15,
      socEnd: 80,
      station: 'Greenway Kraków',
      full: false,
    },
    {
      chargeDate: '2026-02-20',
      mileage: 39980,
      kwh: 48.0,
      pkwh: 0.82,
      charger: 'home_socket',
      socStart: 22,
      socEnd: 81,
      station: null,
      full: false,
    },
    {
      chargeDate: '2026-03-06',
      mileage: 40500,
      kwh: 63.8,
      pkwh: 0.82,
      charger: 'home_socket',
      socStart: 10,
      socEnd: 95,
      station: null,
      full: true,
    },
    {
      chargeDate: '2026-03-22',
      mileage: 41050,
      kwh: 40.1,
      pkwh: 1.45,
      charger: 'dc_ccs',
      socStart: 20,
      socEnd: 72,
      station: 'Ionity A4',
      full: false,
    },
    {
      chargeDate: '2026-04-05',
      mileage: 41600,
      kwh: 52.3,
      pkwh: 0.82,
      charger: 'home_socket',
      socStart: 15,
      socEnd: 85,
      station: null,
      full: false,
    },
    {
      chargeDate: '2026-04-22',
      mileage: 42050,
      kwh: 57.9,
      pkwh: 0.82,
      charger: 'home_socket',
      socStart: 12,
      socEnd: 89,
      station: null,
      full: false,
    },
    {
      chargeDate: '2026-05-10',
      mileage: 42300,
      kwh: 45.6,
      pkwh: 1.39,
      charger: 'ac_type2',
      socStart: 25,
      socEnd: 80,
      station: 'Orlen Charge',
      full: false,
    },
  ];

  for (const e of chargingEntries) {
    await db.insert(schema.chargingSessions).values({
      vehicleId: tesla.id,
      chargeDate: e.chargeDate,
      mileage: e.mileage,
      energyKwh: e.kwh.toFixed(2),
      pricePerKwh: e.pkwh.toFixed(2),
      totalCost: round2(e.kwh, e.pkwh),
      chargerTypeId: chargerTypeId(e.charger),
      socStartPercent: e.socStart,
      socEndPercent: e.socEnd,
      stationName: e.station,
      isFullCharge: e.full,
    });
  }

  console.log(`✓ Charging sessions: ${chargingEntries.length} entries`);

  // ── Service records ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const oilChange = (
    await db
      .insert(schema.serviceRecords)
      .values({
        vehicleId: golf.id,
        serviceDate: '2026-01-15',
        mileage: 81500,
        title: 'Wymiana oleju i filtrów',
        description: 'Olej 5W-30 Castrol Edge 5L, filtr oleju, filtr kabinowy, filtr powietrza',
        laborCost: '150.00',
        totalCost: '420.00',
        workshopName: 'AutoSerwis Kowalski',
      })
      .returning({ id: schema.serviceRecords.id })
  ).at(0)!;

  await db.insert(schema.serviceRecords).values({
    vehicleId: golf.id,
    serviceDate: '2026-03-20',
    mileage: 84500,
    title: 'Wymiana opon — zestaw letni',
    description: 'Michelin Primacy 4+ 205/55R16 × 4, wyważanie, zbieżność',
    laborCost: '80.00',
    totalCost: '1240.00',
    workshopName: 'Oponiarnia Szybka Zmiana',
  });

  await db.insert(schema.serviceRecords).values({
    vehicleId: tesla.id,
    serviceDate: '2026-02-10',
    mileage: 39600,
    title: 'Rotacja opon',
    description: 'Rotacja 4 kół, kontrola ciśnienia, kontrola hamulców',
    laborCost: '60.00',
    totalCost: '60.00',
    workshopName: 'Tesla Service Kraków',
  });

  console.log('✓ Service records: 3 entries');

  // ── Expenses ────────────────────────────────────────────────────────────────
  await db.insert(schema.expenses).values([
    {
      vehicleId: golf.id,
      categoryId: expCatId('insurance'),
      expenseDate: '2026-01-01',
      amount: '1850.00',
      description: 'OC + AC PZU — rok 2026',
      sourceType: 'manual',
    },
    {
      vehicleId: golf.id,
      categoryId: expCatId('inspection'),
      expenseDate: '2026-02-28',
      amount: '198.00',
      description: 'Przegląd techniczny + emisja spalin',
      sourceType: 'manual',
    },
    {
      vehicleId: golf.id,
      categoryId: expCatId('service'),
      expenseDate: '2026-01-15',
      amount: '420.00',
      description: 'Wymiana oleju i filtrów',
      sourceType: 'service_record',
      sourceId: oilChange.id,
    },
    {
      vehicleId: tesla.id,
      categoryId: expCatId('insurance'),
      expenseDate: '2026-01-01',
      amount: '2400.00',
      description: 'OC + AC Ergo Hestia — rok 2026',
      sourceType: 'manual',
    },
    {
      vehicleId: tesla.id,
      categoryId: expCatId('other'),
      expenseDate: '2026-04-15',
      amount: '49.00',
      description: 'Abonament Tesla Premium Connectivity — 3 mies.',
      sourceType: 'manual',
    },
  ]);

  console.log('✓ Expenses: 5 entries');

  // ── Issues ──────────────────────────────────────────────────────────────────
  await db.insert(schema.issues).values([
    {
      vehicleId: golf.id,
      reportedDate: '2026-04-10',
      title: 'Skrzypienie przedniego prawego hamulca',
      description:
        'Przy zwalnianiu słyszalny pisk z prawego przedniego koła, głównie przy zimnym starcie.',
      statusId: issStatId('open'),
      priorityId: issPriId('medium'),
    },
    {
      vehicleId: tesla.id,
      reportedDate: '2026-03-28',
      title: 'Nierównomierne zużycie opon',
      description:
        'Przednie opony zużywają się szybciej po wewnętrznej stronie. Zbieżność sprawdzona — w normie.',
      statusId: issStatId('in_progress'),
      priorityId: issPriId('low'),
    },
  ]);

  console.log('✓ Issues: 2 entries');

  // ── Reminders ───────────────────────────────────────────────────────────────
  await db.insert(schema.reminders).values([
    {
      vehicleId: golf.id,
      title: 'Wymiana oleju',
      description: 'Kolejna wymiana oleju co 15 000 km lub rok',
      dueMileage: 96500,
      dueDate: '2027-01-15',
      statusId: remStatId('pending'),
    },
    {
      vehicleId: golf.id,
      title: 'Odnowienie ubezpieczenia OC/AC',
      dueDate: '2027-01-01',
      statusId: remStatId('pending'),
    },
    {
      vehicleId: tesla.id,
      title: 'Roczny przegląd Tesla',
      dueDate: '2027-02-10',
      dueMileage: 60000,
      statusId: remStatId('pending'),
    },
  ]);

  console.log('✓ Reminders: 3 entries');

  await client.end();
  console.log('\nDev seed complete!');
  console.log(`  Login: ${TEST_EMAIL}`);
  console.log(`  Hasło: ${TEST_PASSWORD}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
