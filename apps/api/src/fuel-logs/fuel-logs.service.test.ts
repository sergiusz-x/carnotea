import { describe, expect, it } from 'vitest';

import { computeConsumptionHint, computeTotalCost } from './fuel-logs.service.js';

describe('computeTotalCost', () => {
  it('rounds to 2 decimal places', () => {
    expect(computeTotalCost(40, 1.8)).toBe(72);
    expect(computeTotalCost(33.5, 1.739)).toBe(58.26);
    expect(computeTotalCost(41.23, 1.699)).toBe(70.05);
  });

  it('matches the DB formula round(liters * pricePerLiter, 2)', () => {
    // 50 * 1.234 = 61.7 → rounds to 61.70
    expect(computeTotalCost(50, 1.234)).toBe(61.7);
    // 10 * 1.005 = 10.05
    expect(computeTotalCost(10, 1.005)).toBe(10.05);
  });
});

describe('computeConsumptionHint', () => {
  it('returns null when current refuel is not full-tank', () => {
    expect(computeConsumptionHint(40, 50000, false, 49000)).toBeNull();
  });

  it('returns null when there is no previous full-tank refuel', () => {
    expect(computeConsumptionHint(40, 50000, true, null)).toBeNull();
  });

  it('returns null when mileage difference is zero or negative', () => {
    expect(computeConsumptionHint(40, 50000, true, 50000)).toBeNull();
    expect(computeConsumptionHint(40, 50000, true, 50001)).toBeNull();
  });

  it('computes L/100km correctly between two full-tank refuels', () => {
    // 40L over 500km → 8.0 L/100km
    expect(computeConsumptionHint(40, 50500, true, 50000)).toBe(8);
  });

  it('rounds the hint to 2 decimal places', () => {
    // 41L over 520km → 41/520*100 = 7.884615... → 7.88
    expect(computeConsumptionHint(41, 50520, true, 50000)).toBe(7.88);
  });

  it('returns null for partial fill even with a previous full-tank', () => {
    expect(computeConsumptionHint(20, 50200, false, 50000)).toBeNull();
  });
});
