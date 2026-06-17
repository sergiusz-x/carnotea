import { describe, expect, it } from 'vitest';

import { ChargingSessionCreateSchema, ChargingSessionUpdateSchema } from './charging-session.js';

describe('ChargingSessionCreateSchema', () => {
  it('accepts a valid session with SoC start < end', () => {
    const parsed = ChargingSessionCreateSchema.parse({
      chargeDate: '2026-04-01',
      mileage: 15000,
      energyKwh: '40.00',
      pricePerKwh: '0.45',
      chargerType: 'dc_ccs',
      socStartPercent: 20,
      socEndPercent: 80,
    });
    expect(parsed.chargerType).toBe('dc_ccs');
  });

  it('rejects an out-of-range SoC', () => {
    expect(() =>
      ChargingSessionCreateSchema.parse({
        chargeDate: '2026-04-01',
        mileage: 15000,
        energyKwh: 40,
        pricePerKwh: 0.45,
        chargerType: 'dc_ccs',
        socStartPercent: 20,
        socEndPercent: 120,
      }),
    ).toThrow();
  });

  it('rejects socStart >= socEnd', () => {
    expect(() =>
      ChargingSessionCreateSchema.parse({
        chargeDate: '2026-04-01',
        mileage: 15000,
        energyKwh: 40,
        pricePerKwh: 0.45,
        chargerType: 'ac_type2',
        socStartPercent: 80,
        socEndPercent: 80,
      }),
    ).toThrow();
  });

  it('does not inject the isFullCharge default on an empty update', () => {
    expect(ChargingSessionUpdateSchema.parse({})).toEqual({});
  });
});
