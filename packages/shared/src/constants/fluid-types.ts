export const FLUID_TYPE_CODES = [
  'engine_oil',
  'oil_filter',
  'brake_fluid',
  'coolant',
  'power_steering_fluid',
  'washer_fluid',
  'transmission_fluid',
  'other',
] as const;

export type FluidTypeCode = (typeof FLUID_TYPE_CODES)[number];
