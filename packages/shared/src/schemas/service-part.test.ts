import { describe, expect, it } from 'vitest';

import { ServicePartCreateSchema, ServicePartUpdateSchema } from './service-part.js';

describe('ServicePartCreateSchema', () => {
  it('accepts a valid line and defaults quantity to 1', () => {
    const parsed = ServicePartCreateSchema.parse({
      partId: '22222222-2222-4222-8222-222222222222',
      unitPrice: '49.99',
    });
    expect(parsed.quantity).toBe(1);
    expect('totalPrice' in parsed).toBe(false);
  });

  it('rejects a non-positive quantity', () => {
    expect(() =>
      ServicePartCreateSchema.parse({
        partId: '22222222-2222-4222-8222-222222222222',
        unitPrice: 49.99,
        quantity: 0,
      }),
    ).toThrow();
  });

  it('does not inject the quantity default on an empty update', () => {
    expect(ServicePartUpdateSchema.parse({})).toEqual({});
  });
});
