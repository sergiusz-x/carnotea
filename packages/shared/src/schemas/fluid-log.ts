import { z } from 'zod';

import { FLUID_TYPE_CODES } from '../constants/fluid-types.js';

import {
  dateField,
  mileageField,
  moneyField,
  positiveDecimalField,
  timestampField,
  uuidField,
} from './_shared.js';

const fluidLogFields = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  changeDate: dateField(),
  mileage: mileageField(),
  fluidType: z.enum(FLUID_TYPE_CODES),
  quantityLiters: positiveDecimalField(6).nullish(),
  cost: moneyField(10).nullish(),
  intervalKm: z.number().int().positive().nullish(),
  intervalMonths: z.number().int().positive().nullish(),
  workshopName: z.string().max(120).nullish(),
  notes: z.string().max(2000).nullish(),
  nextDueMileage: z.number().int().nonnegative().nullable(),
  nextDueDate: z.iso.date().nullable(),
  createdAt: timestampField(),
});

export const FluidLogSchema = fluidLogFields;

const fluidLogCreateFields = fluidLogFields.omit({
  id: true,
  vehicleId: true,
  nextDueMileage: true,
  nextDueDate: true,
  createdAt: true,
});

export const FluidLogCreateSchema = fluidLogCreateFields;

export const FluidLogUpdateSchema = fluidLogCreateFields.partial();

export type FluidLog = z.infer<typeof FluidLogSchema>;
export type FluidLogCreate = z.infer<typeof FluidLogCreateSchema>;
export type FluidLogUpdate = z.infer<typeof FluidLogUpdateSchema>;
