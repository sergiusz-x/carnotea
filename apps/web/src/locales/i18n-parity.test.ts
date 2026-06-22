import { describe, expect, it } from 'vitest';

import enAuth from './en/auth.json';
import enExpenses from './en/expenses.json';
import enFuelLogs from './en/fuel-logs.json';
import enNav from './en/nav.json';
import plAuth from './pl/auth.json';
import plExpenses from './pl/expenses.json';
import plFuelLogs from './pl/fuel-logs.json';
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

describe('i18n parity — fuel-logs namespace', () => {
  it('pl and en have the same keys', () => {
    const plKeys = flatKeys(plFuelLogs).sort();
    const enKeys = flatKeys(enFuelLogs).sort();
    expect(plKeys).toEqual(enKeys);
  });
});

describe('i18n parity — expenses namespace', () => {
  it('pl and en have the same keys', () => {
    const plKeys = flatKeys(plExpenses).sort();
    const enKeys = flatKeys(enExpenses).sort();
    expect(plKeys).toEqual(enKeys);
  });
});
