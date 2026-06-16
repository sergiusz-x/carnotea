import { z } from 'zod';

import { CHARGER_TYPE_CODES } from '../constants/charger-types.js';

import {
  dateField,
  mileageField,
  moneyField,
  positiveDecimalField,
  socPercentField,
  timestampField,
  uuidField,
} from './_shared.js';

/**
 * Charging session. The DB stores `chargerTypeId` (FK to the `charger_types`
 * lookup); the contract exposes the stable `chargerType` code. `totalCost` is
 * DB-computed (`round(energyKwh * pricePerKwh, 2)`) and read-only. When both SoC
 * values are present the DB requires `socStartPercent < socEndPercent`.
 */
const chargingSessionFields = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  chargeDate: dateField(),
  mileage: mileageField(),
  energyKwh: positiveDecimalField(),
  pricePerKwh: positiveDecimalField(),
  totalCost: moneyField(),
  chargerType: z.enum(CHARGER_TYPE_CODES),
  socStartPercent: socPercentField().nullish(),
  socEndPercent: socPercentField().nullish(),
  stationName: z.string().max(120).nullish(),
  isFullCharge: z.boolean().default(true),
  createdAt: timestampField(),
});

const socOrderRefine = (value: {
  socStartPercent?: number | null;
  socEndPercent?: number | null;
}): boolean =>
  value.socStartPercent == null ||
  value.socEndPercent == null ||
  value.socStartPercent < value.socEndPercent;

const socOrderError = {
  message: 'socStartPercent must be less than socEndPercent',
  path: ['socEndPercent'],
};

export const ChargingSessionSchema = chargingSessionFields.refine(socOrderRefine, socOrderError);

const chargingSessionCreateFields = chargingSessionFields.omit({
  id: true,
  vehicleId: true,
  totalCost: true,
  createdAt: true,
});

export const ChargingSessionCreateSchema = chargingSessionCreateFields.refine(
  socOrderRefine,
  socOrderError,
);

export const ChargingSessionUpdateSchema = chargingSessionCreateFields
  .partial()
  .refine(socOrderRefine, socOrderError);

export type ChargingSession = z.infer<typeof ChargingSessionSchema>;
export type ChargingSessionCreate = z.infer<typeof ChargingSessionCreateSchema>;
export type ChargingSessionUpdate = z.infer<typeof ChargingSessionUpdateSchema>;
