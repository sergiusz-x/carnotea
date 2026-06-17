import { describe, expect, it } from 'vitest';

import { formatDate, formatDistanceKm } from './format';

describe('formatDate', () => {
  const date = new Date('2026-06-17T12:00:00Z');

  it('formats a long date in English', () => {
    expect(formatDate(date, 'en')).toBe('June 17, 2026');
  });

  it('formats a long date in Polish', () => {
    expect(formatDate(date, 'pl')).toBe('17 czerwca 2026');
  });
});

describe('formatDistanceKm', () => {
  // ICU separates groups and the unit with non-breaking spaces; normalize them
  // to a plain space so the assertions don't depend on the exact code point.
  const normalize = (value: string) => value.replace(/\s/g, ' ');

  it('uses the English grouping and decimal separators', () => {
    expect(normalize(formatDistanceKm(12345.6, 'en'))).toBe('12,345.6 km');
  });

  it('uses the Polish grouping and decimal separators', () => {
    expect(normalize(formatDistanceKm(12345.6, 'pl'))).toBe('12 345,6 km');
  });
});
