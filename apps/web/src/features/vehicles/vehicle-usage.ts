import { type Vehicle } from '@carnotea/shared';

type FuelType = Vehicle['fuelType'];

export function supportsFuelLogs(fuelType: FuelType | null | undefined): boolean {
  return fuelType !== 'electric';
}

export function supportsCharging(fuelType: FuelType | null | undefined): boolean {
  return fuelType === 'electric' || fuelType === 'hybrid';
}
