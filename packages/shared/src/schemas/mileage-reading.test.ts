import { describe, expect, it } from 'vitest';

import { MileageReadingCreateSchema } from './mileage-reading.js';

describe('MileageReadingCreateSchema', () => {
  it('accepts a manual reading', () => {
    const parsed = MileageReadingCreateSchema.parse({
      readingDate: '2026-02-01',
      mileage: 123456,
      note: 'after road trip',
    });
    expect(parsed.mileage).toBe(123456);
  });

  it('rejects a negative mileage', () => {
    expect(() =>
      MileageReadingCreateSchema.parse({ readingDate: '2026-02-01', mileage: -1 }),
    ).toThrow();
  });
});
