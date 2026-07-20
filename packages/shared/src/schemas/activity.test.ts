import { describe, expect, it } from 'vitest';

import {
  ActivityEntrySchema,
  ActivityFeedResponseSchema,
  ActivityQuerySchema,
} from './activity.js';

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  vehicleId: '22222222-2222-4222-8222-222222222222',
  occurredAt: '2026-06-30',
  mileage: 84217,
};

describe('ActivityEntrySchema', () => {
  it('parses a fuel entry', () => {
    const parsed = ActivityEntrySchema.parse({
      ...base,
      kind: 'fuel',
      liters: '42.00',
      totalCost: '272.58',
      isFullTank: true,
      stationName: 'Orlen A4',
    });
    expect(parsed.kind).toBe('fuel');
    if (parsed.kind === 'fuel') expect(parsed.liters).toBe(42);
  });

  it('parses a charge entry with SoC start/end', () => {
    const parsed = ActivityEntrySchema.parse({
      ...base,
      kind: 'charge',
      energyKwh: '38.2',
      totalCost: '61.40',
      chargerType: 'dc_ccs',
      isFullCharge: false,
      stationName: 'Ionity',
      socStartPercent: 22,
      socEndPercent: 80,
    });
    expect(parsed.kind).toBe('charge');
  });

  it('parses a recurring reminder entry with a nullable dueDate', () => {
    const parsed = ActivityEntrySchema.parse({
      ...base,
      mileage: null,
      kind: 'reminder',
      title: 'Wymiana oleju',
      mode: 'recurring',
      status: 'pending',
      dueState: 'due_soon',
      dueDate: null,
      dueMileage: null,
      intervalKm: 10000,
      intervalMonths: 12,
      lastPerformedDate: '2026-01-15',
      lastPerformedMileage: 80000,
      nextDueDate: '2027-01-15',
      nextDueMileage: 90000,
    });
    expect(parsed.kind).toBe('reminder');
  });

  it('coerces stringified money to a number', () => {
    const parsed = ActivityEntrySchema.parse({
      ...base,
      kind: 'service',
      title: 'Przegląd',
      totalCost: '540.00',
      workshopName: null,
      partCount: 3,
    });
    if (parsed.kind === 'service') expect(parsed.totalCost).toBe(540);
  });

  it('parses a fluid entry with an optional cost', () => {
    const parsed = ActivityEntrySchema.parse({
      ...base,
      kind: 'fluid',
      fluidType: 'engine_oil',
      quantityLiters: '4.50',
      cost: null,
      workshopName: 'ACME Garage',
    });
    expect(parsed.kind).toBe('fluid');
    if (parsed.kind === 'fluid') {
      expect(parsed.quantityLiters).toBe(4.5);
      expect(parsed.cost).toBeNull();
    }
  });

  it('rejects an unknown discriminant', () => {
    expect(() => ActivityEntrySchema.parse({ ...base, kind: 'spaceship' })).toThrow();
  });
});

describe('ActivityFeedResponseSchema', () => {
  it('parses a page with a null cursor at the end', () => {
    const parsed = ActivityFeedResponseSchema.parse({ items: [], nextCursor: null });
    expect(parsed.items).toHaveLength(0);
    expect(parsed.nextCursor).toBeNull();
  });
});

describe('ActivityQuerySchema', () => {
  it('defaults limit to 30 and coerces a string limit', () => {
    expect(ActivityQuerySchema.parse({}).limit).toBe(30);
    expect(ActivityQuerySchema.parse({ limit: '50' }).limit).toBe(50);
  });

  it('rejects a limit above the max', () => {
    expect(() => ActivityQuerySchema.parse({ limit: 200 })).toThrow();
  });
});
