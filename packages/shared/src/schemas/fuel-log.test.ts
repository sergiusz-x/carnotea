import { describe, expect, it } from 'vitest';

import { FuelLogCreateSchema, FuelLogUpdateSchema } from './fuel-log.js';

describe('FuelLogCreateSchema', () => {
  it('accepts a valid refuel and coerces stringified decimals', () => {
    const parsed = FuelLogCreateSchema.parse({
      fuelDate: '2026-03-01',
      mileage: 80000,
      liters: '42.50',
      pricePerLiter: '1.89',
      stationName: 'Orlen',
      description: 'Return trip refill',
    });
    expect(parsed.liters).toBeCloseTo(42.5);
    expect(parsed.isFullTank).toBe(true);
    expect(parsed.description).toBe('Return trip refill');
    expect('totalCost' in parsed).toBe(false);
  });

  it('rejects non-positive liters', () => {
    expect(() =>
      FuelLogCreateSchema.parse({
        fuelDate: '2026-03-01',
        mileage: 80000,
        liters: 0,
        pricePerLiter: 1.89,
      }),
    ).toThrow();
  });

  it('rejects liters beyond the numeric(8, 2) precision', () => {
    expect(() =>
      FuelLogCreateSchema.parse({
        fuelDate: '2026-03-01',
        mileage: 80000,
        liters: 1_000_000,
        pricePerLiter: 1.89,
      }),
    ).toThrow();
  });

  it('does not inject the isFullTank default on an empty update', () => {
    expect(FuelLogUpdateSchema.parse({})).toEqual({});
  });
});
