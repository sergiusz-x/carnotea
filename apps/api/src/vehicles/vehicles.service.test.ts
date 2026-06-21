import { describe, expect, it } from 'vitest';

import { vehicleEnergySourceIssue } from './vehicles.service.js';

describe('vehicleEnergySourceIssue', () => {
  it('rejects changing a vehicle with fuel logs to electric', () => {
    expect(
      vehicleEnergySourceIssue('electric', {
        hasFuelLogs: true,
        hasChargingSessions: false,
      }),
    ).toMatchObject({
      code: 'invalid_energy_source',
      path: ['fuelType'],
    });
  });

  it('rejects changing a vehicle with charging sessions to an ICE-only fuel type', () => {
    expect(
      vehicleEnergySourceIssue('petrol', {
        hasFuelLogs: false,
        hasChargingSessions: true,
      }),
    ).toMatchObject({
      code: 'invalid_energy_source',
      path: ['fuelType'],
    });
  });

  it('allows hybrid or other fuel types to keep both fuel and charging entries', () => {
    expect(
      vehicleEnergySourceIssue('hybrid', {
        hasFuelLogs: true,
        hasChargingSessions: true,
      }),
    ).toBeNull();
    expect(
      vehicleEnergySourceIssue('other', {
        hasFuelLogs: true,
        hasChargingSessions: true,
      }),
    ).toBeNull();
  });
});
