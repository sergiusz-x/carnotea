import { z } from 'zod';

import { FUEL_TYPE_CODES } from '../constants/fuel-types.js';

import { currencyCodeField, mileageField, timestampField, uuidField } from './_shared.js';

/**
 * Vehicle contract. The DB stores `fuelTypeId` (FK to the `fuel_types` lookup);
 * the contract exposes the stable `fuelType` code instead, mapped to/from the
 * id in the API layer. `currentMileage` is server-maintained by the mileage
 * sync rule (T-021), so it is read-only here.
 */
const vehicleFields = z.object({
  id: uuidField(),
  brand: z.string().min(1).max(80),
  model: z.string().min(1).max(80),
  generation: z.string().max(80).nullish(),
  productionYear: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1),
  engine: z.string().max(80).nullish(),
  fuelType: z.enum(FUEL_TYPE_CODES),
  vin: z.string().length(17).nullish(),
  registrationNumber: z.string().max(20).nullish(),
  currentMileage: mileageField(),
  currencyCode: currencyCodeField(),
  createdAt: timestampField(),
  updatedAt: timestampField(),
});

export const VehicleSchema = vehicleFields;

const vehicleCreateFields = vehicleFields.omit({
  id: true,
  currentMileage: true,
  createdAt: true,
  updatedAt: true,
});

export const VehicleCreateSchema = vehicleCreateFields.extend({
  currencyCode: currencyCodeField().default('EUR'),
});

// Update derives from the default-free createable shape so an omitted field is
// left untouched (PATCH semantics) rather than reset to its create-time default.
export const VehicleUpdateSchema = vehicleCreateFields.partial();

export type Vehicle = z.infer<typeof VehicleSchema>;
export type VehicleCreate = z.infer<typeof VehicleCreateSchema>;
export type VehicleUpdate = z.infer<typeof VehicleUpdateSchema>;
