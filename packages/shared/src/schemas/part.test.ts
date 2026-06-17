import { describe, expect, it } from 'vitest';

import { PartCreateSchema, PartUpdateSchema } from './part.js';

describe('PartCreateSchema', () => {
  it('accepts a valid part and defaults price to 0', () => {
    const parsed = PartCreateSchema.parse({ name: 'Oil filter', manufacturer: 'Mann' });
    expect(parsed.defaultPrice).toBe(0);
  });

  it('rejects a negative default price', () => {
    expect(() => PartCreateSchema.parse({ name: 'Oil filter', defaultPrice: -5 })).toThrow();
  });

  it('does not inject the defaultPrice default on an empty update', () => {
    expect(PartUpdateSchema.parse({})).toEqual({});
  });
});
