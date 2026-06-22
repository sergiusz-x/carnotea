import { describe, expect, it } from 'vitest';

import { ServiceRecordCreateSchema, ServiceRecordUpdateSchema } from './service-record.js';

describe('ServiceRecordCreateSchema', () => {
  it('accepts a valid record and defaults labor cost to 0', () => {
    const parsed = ServiceRecordCreateSchema.parse({
      serviceDate: '2026-05-01',
      mileage: 90000,
      title: 'Oil change',
    });
    expect(parsed.laborCost).toBe(0);
    expect('totalCost' in parsed).toBe(false);
  });

  it('accepts a record with parts', () => {
    const parsed = ServiceRecordCreateSchema.parse({
      serviceDate: '2026-05-01',
      mileage: 90000,
      title: 'Oil change',
      laborCost: 50,
      parts: [
        { name: 'Oil filter', manufacturer: 'Mann', partNumber: 'HU 711/6 x', quantity: 1, unitPrice: 12.99 },
        { name: 'Engine oil 5W-30', quantity: 5, unitPrice: 8.5 },
      ],
    });
    expect(parsed.parts).toBeDefined();
    if (!parsed.parts) return;
    expect(parsed.parts).toHaveLength(2);
    expect(parsed.parts[0]?.name).toBe('Oil filter');
    expect(parsed.parts[0]?.quantity).toBe(1);
    expect(parsed.parts[1]?.quantity).toBe(5);
    expect(parsed.laborCost).toBe(50);
  });

  it('defaults part quantity to 1', () => {
    const parsed = ServiceRecordCreateSchema.parse({
      serviceDate: '2026-05-01',
      mileage: 90000,
      title: 'Oil change',
      parts: [{ name: 'Oil filter', unitPrice: 12.99 }],
    });
    expect(parsed.parts).toBeDefined();
    if (!parsed.parts) return;
    expect(parsed.parts[0]?.quantity).toBe(1);
  });

  it('rejects an empty title', () => {
    expect(() =>
      ServiceRecordCreateSchema.parse({ serviceDate: '2026-05-01', mileage: 90000, title: '' }),
    ).toThrow();
  });

  it('rejects parts with empty name', () => {
    expect(() =>
      ServiceRecordCreateSchema.parse({
        serviceDate: '2026-05-01',
        mileage: 90000,
        title: 'Fix',
        parts: [{ name: '', unitPrice: 10 }],
      }),
    ).toThrow();
  });

  it('rejects parts with zero unitPrice', () => {
    expect(() =>
      ServiceRecordCreateSchema.parse({
        serviceDate: '2026-05-01',
        mileage: 90000,
        title: 'Fix',
        parts: [{ name: 'Filter', unitPrice: 0 }],
      }),
    ).toThrow();
  });

  it('does not inject the laborCost default on an empty update', () => {
    expect(ServiceRecordUpdateSchema.parse({})).toEqual({});
  });
});