import { describe, expect, it } from 'vitest';

import { computeTotalPrice } from './service-records.service.js';

describe('computeTotalPrice', () => {
  it('computes quantity * unitPrice rounded to 2 decimal places', () => {
    expect(computeTotalPrice(1, 12.99)).toBe(12.99);
    expect(computeTotalPrice(5, 8.5)).toBe(42.5);
    expect(computeTotalPrice(2.5, 10)).toBe(25);
    expect(computeTotalPrice(0.5, 99.99)).toBe(50);
    expect(computeTotalPrice(3, 1.234)).toBe(3.7);
  });

  it('matches the DB formula round(quantity * unitPrice, 2)', () => {
    // 2 * 50 = 100 → 100.00
    expect(computeTotalPrice(2, 50)).toBe(100);
    // 1.5 * 19.99 = 29.985 → 29.99
    expect(computeTotalPrice(1.5, 19.99)).toBe(29.99);
    // 10 * 1.005 = 10.05
    expect(computeTotalPrice(10, 1.005)).toBe(10.05);
  });
});