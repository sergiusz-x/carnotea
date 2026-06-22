import { describe, expect, it } from 'vitest';

import enAuth from './en/auth.json';
import enNav from './en/nav.json';
import plAuth from './pl/auth.json';
import plNav from './pl/nav.json';

function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const full = prefix ? `${prefix}.${k}` : k;
    return v !== null && typeof v === 'object'
      ? flatKeys(v as Record<string, unknown>, full)
      : [full];
  });
}

describe('i18n parity — auth namespace', () => {
  it('pl and en have the same keys', () => {
    const plKeys = flatKeys(plAuth).sort();
    const enKeys = flatKeys(enAuth).sort();
    expect(plKeys).toEqual(enKeys);
  });
});

describe('i18n parity — nav namespace', () => {
  it('pl and en have the same keys', () => {
    const plKeys = flatKeys(plNav).sort();
    const enKeys = flatKeys(enNav).sort();
    expect(plKeys).toEqual(enKeys);
  });
});
