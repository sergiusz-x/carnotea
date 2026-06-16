import { describe, expect, it } from 'vitest';

import { ServiceRecordCreateSchema } from './service-record.js';

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

  it('rejects an empty title', () => {
    expect(() =>
      ServiceRecordCreateSchema.parse({ serviceDate: '2026-05-01', mileage: 90000, title: '' }),
    ).toThrow();
  });
});
