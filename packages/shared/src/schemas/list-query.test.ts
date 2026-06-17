import { describe, expect, it } from 'vitest';

import { ListQuerySchema } from './list-query.js';

describe('ListQuerySchema', () => {
  it('applies defaults and coerces stringified pagination', () => {
    const parsed = ListQuerySchema.parse({ page: '2', pageSize: '50' });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(50);
    expect(parsed.sortOrder).toBe('desc');
  });

  it('rejects a page size above the max', () => {
    expect(() => ListQuerySchema.parse({ pageSize: 1000 })).toThrow();
  });

  it('rejects an inverted date range', () => {
    expect(() => ListQuerySchema.parse({ dateFrom: '2026-02-01', dateTo: '2026-01-01' })).toThrow();
  });
});
