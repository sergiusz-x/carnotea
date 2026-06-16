import { describe, expect, it } from 'vitest';

import { FuelLogCreateSchema } from './fuel-log.js';

describe('FuelLogCreateSchema', () => {
  it('accepts a valid refuel and coerces stringified decimals', () => {
    const parsed = FuelLogCreateSchema.parse({
      fuelDate: '2026-03-01',
      mileage: 80000,
      liters: '42.50',
      pricePerLiter: '1.89',
      stationName: 'Orlen',
    });
    expect(parsed.liters).toBeCloseTo(42.5);
    expect(parsed.isFullTank).toBe(true);
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
});
