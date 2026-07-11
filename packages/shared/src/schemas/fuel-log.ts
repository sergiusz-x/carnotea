import { z } from 'zod';

import {
  dateField,
  mileageField,
  moneyField,
  positiveDecimalField,
  timestampField,
  uuidField,
} from './_shared.js';

/**
 * Fuel refuel log. `totalCost` is a DB-computed value
 * (`round(liters * pricePerLiter, 2)`), so it is read-only in the contract.
 */
const fuelLogFields = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  fuelDate: dateField(),
  mileage: mileageField(),
  liters: positiveDecimalField(8),
  pricePerLiter: positiveDecimalField(8),
  totalCost: moneyField(10),
  stationName: z.string().max(120).nullish(),
  description: z.string().nullish(),
  isFullTank: z.boolean(),
  createdAt: timestampField(),
});

export const FuelLogSchema = fuelLogFields;

const fuelLogCreateFields = fuelLogFields.omit({
  id: true,
  vehicleId: true,
  totalCost: true,
  createdAt: true,
});

export const FuelLogCreateSchema = fuelLogCreateFields.extend({
  isFullTank: z.boolean().default(true),
});

export const FuelLogUpdateSchema = fuelLogCreateFields.partial();

export type FuelLog = z.infer<typeof FuelLogSchema>;
export type FuelLogCreate = z.infer<typeof FuelLogCreateSchema>;
export type FuelLogUpdate = z.infer<typeof FuelLogUpdateSchema>;
