import { describe, expect, it } from 'vitest';

import {
  calculateChargingMetrics,
  isElectricVehicle,
  resolveLatestMileage,
  resolveVehicleSwitchPath,
  supportsCharging,
  supportsFuelLogs,
} from './vehicle-usage';

describe('vehicle usage helpers', () => {
  it('hides fuel logs and keeps charging for electric vehicles', () => {
    expect(isElectricVehicle('electric')).toBe(true);
    expect(supportsFuelLogs('electric')).toBe(false);
    expect(supportsCharging('electric')).toBe(true);
  });

  it('keeps both fuel and charging for hybrids', () => {
    expect(isElectricVehicle('hybrid')).toBe(false);
    expect(supportsFuelLogs('hybrid')).toBe(true);
    expect(supportsCharging('hybrid')).toBe(true);
  });

  it('resolves latest mileage from current mileage and readings', () => {
    expect(resolveLatestMileage(123_000, [])).toBe(123_000);
    expect(resolveLatestMileage(undefined, [{ mileage: 98_000 }])).toBe(98_000);
    expect(resolveLatestMileage(100_000, [{ mileage: 99_000 }, { mileage: 101_500 }])).toBe(
      101_500,
    );
  });

  it('calculates charging cost and average energy consumption from ordered mileage deltas', () => {
    expect(
      calculateChargingMetrics([
        {
          chargeDate: '2026-06-01',
          mileage: 10_000,
          energyKwh: 20,
          totalCost: 30,
        },
        {
          chargeDate: '2026-06-05',
          mileage: 10_250,
          energyKwh: 25,
          totalCost: 37.5,
        },
        {
          chargeDate: '2026-06-10',
          mileage: 10_500,
          energyKwh: 22.5,
          totalCost: 33.75,
        },
      ]),
    ).toEqual({
      totalChargingCost: 101.25,
      avgEnergyConsumption: 9.5,
    });
  });

  it('ignores non-increasing mileage when computing EV consumption', () => {
    expect(
      calculateChargingMetrics([
        {
          chargeDate: '2026-06-01',
          mileage: 20_000,
          energyKwh: 30,
          totalCost: 45,
        },
        {
          chargeDate: '2026-06-02',
          mileage: 19_900,
          energyKwh: 10,
          totalCost: 15,
        },
      ]),
    ).toEqual({
      totalChargingCost: 60,
      avgEnergyConsumption: null,
    });
  });

  it('keeps the same panel when switching to a vehicle that supports it', () => {
    expect(resolveVehicleSwitchPath('/vehicles/a/charging', 'b', 'electric')).toBe(
      '/vehicles/b/charging',
    );
    expect(resolveVehicleSwitchPath('/vehicles/a/service', 'b', 'petrol')).toBe(
      '/vehicles/b/service',
    );
  });

  it('falls back to the overview panel when the new vehicle lacks the current panel', () => {
    expect(resolveVehicleSwitchPath('/vehicles/a/charging', 'b', 'petrol')).toBe('/vehicles/b');
    expect(resolveVehicleSwitchPath('/vehicles/a/fuel', 'b', 'electric')).toBe('/vehicles/b');
  });

  it('falls back to the overview panel when not on a known sub-panel', () => {
    expect(resolveVehicleSwitchPath('/vehicles/a', 'b', 'petrol')).toBe('/vehicles/b');
    expect(resolveVehicleSwitchPath('/vehicles/a/edit', 'b', 'petrol')).toBe('/vehicles/b');
  });
});
