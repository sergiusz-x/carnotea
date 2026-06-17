import { describe, expect, it } from 'vitest';

import { VehicleCreateSchema, VehicleSchema, VehicleUpdateSchema } from './vehicle.js';

describe('VehicleSchema', () => {
  it('accepts a valid vehicle read row', () => {
    const parsed = VehicleSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      brand: 'Toyota',
      model: 'Corolla',
      generation: null,
      productionYear: 2018,
      engine: '1.8 Hybrid',
      fuelType: 'hybrid',
      vin: 'JTDBR32E230000001',
      registrationNumber: 'KR12345',
      currentMileage: 120000,
      currencyCode: 'eur',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    expect(parsed.fuelType).toBe('hybrid');
    expect(parsed.currencyCode).toBe('EUR');
  });

  it('defaults currency to EUR and omits server-owned fields on create', () => {
    const parsed = VehicleCreateSchema.parse({
      brand: 'VW',
      model: 'Golf',
      productionYear: 2020,
      fuelType: 'diesel',
    });
    expect(parsed.currencyCode).toBe('EUR');
    expect('id' in parsed).toBe(false);
    expect('currentMileage' in parsed).toBe(false);
  });

  it('rejects an unknown fuel type', () => {
    expect(() =>
      VehicleCreateSchema.parse({
        brand: 'VW',
        model: 'Golf',
        productionYear: 2020,
        fuelType: 'nuclear',
      }),
    ).toThrow();
  });

  it('rejects a VIN that is not exactly 17 characters', () => {
    expect(() =>
      VehicleCreateSchema.parse({
        brand: 'VW',
        model: 'Golf',
        productionYear: 2020,
        fuelType: 'diesel',
        vin: 'TOOSHORT',
      }),
    ).toThrow();
  });

  it('does not inject the currency default on an empty update (PATCH semantics)', () => {
    expect(VehicleUpdateSchema.parse({})).toEqual({});
  });
});
