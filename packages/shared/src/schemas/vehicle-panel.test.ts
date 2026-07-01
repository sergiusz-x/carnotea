import { describe, expect, it } from 'vitest';

import { VehiclePanelSchema } from './vehicle-panel.js';

const fullPanel = {
  vehicleId: '33333333-3333-4333-8333-333333333333',
  brand: 'BMW',
  model: 'i4 eDrive40',
  productionYear: 2023,
  fuelType: 'electric',
  currentMileage: 84217,
  currency: 'PLN',
  energy: { kind: 'charge', socPercent: 72, rangeKm: 295 },
  nextService: { dueDate: '2026-08-30', dueInKm: 1240, dueState: 'due_soon' },
  monthCost: { total: '612.00', prevTotal: '748.00', currency: 'PLN' },
  avgConsumption: { value: 16.8, unit: 'kwh_per_100km' },
};

describe('VehiclePanelSchema', () => {
  it('parses a full vitals object and coerces money', () => {
    const parsed = VehiclePanelSchema.parse(fullPanel);
    expect(parsed.monthCost.total).toBe(612);
    expect(parsed.energy?.kind).toBe('charge');
  });

  it('parses with all optional vitals null', () => {
    const parsed = VehiclePanelSchema.parse({
      ...fullPanel,
      energy: null,
      nextService: null,
      avgConsumption: null,
    });
    expect(parsed.energy).toBeNull();
    expect(parsed.nextService).toBeNull();
    expect(parsed.avgConsumption).toBeNull();
  });

  it('rejects an out-of-range SoC percent', () => {
    expect(() =>
      VehiclePanelSchema.parse({
        ...fullPanel,
        energy: { kind: 'charge', socPercent: 140, rangeKm: null },
      }),
    ).toThrow();
  });

  it('uppercases the currency code', () => {
    const parsed = VehiclePanelSchema.parse({
      ...fullPanel,
      currency: 'pln',
      monthCost: { ...fullPanel.monthCost, currency: 'pln' },
    });
    expect(parsed.currency).toBe('PLN');
  });
});
