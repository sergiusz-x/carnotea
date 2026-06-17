export const FUEL_TYPE_CODES = ['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'other'] as const;

export type FuelTypeCode = (typeof FUEL_TYPE_CODES)[number];
