import { z } from 'zod';

import { FUEL_TYPE_CODES } from '../constants/fuel-types.js';

import {
  currencyCodeField,
  dateField,
  mileageField,
  moneyField,
  socPercentField,
  uuidField,
} from './_shared.js';

/**
 * The minimal vehicle panel shown above the Dziennik feed. Vitals are derived
 * and partly optional — only what the stored data supports is computed, the rest
 * is `null`. Do not invent data the app does not record. See
 * `docs/redesign/cockpit-logbook-plan.md` §4b.
 */

/** Latest known energy state: charge % for EV/hybrid (from charging sessions), else fuel/none. */
export const VehiclePanelEnergySchema = z.object({
  kind: z.enum(['charge', 'fuel', 'none']),
  socPercent: socPercentField().nullable(),
  rangeKm: z.number().int().nonnegative().nullable(),
});

/** Nearest pending service-type reminder, with its computed due state. */
export const VehiclePanelNextServiceSchema = z.object({
  dueDate: dateField().nullable(),
  dueInKm: z.number().int().nullable(), // may be negative when overdue by mileage
  dueState: z.enum(['overdue', 'due_soon', 'ok']),
});

/** This calendar month's spend vs the previous month, for the trend note. */
export const VehiclePanelMonthCostSchema = z.object({
  total: moneyField(),
  prevTotal: moneyField(),
  currency: currencyCodeField(),
});

/** Average consumption, unit depends on the vehicle's fuel type. */
export const VehiclePanelConsumptionSchema = z.object({
  value: z.number().nonnegative(),
  unit: z.enum(['l_per_100km', 'kwh_per_100km']),
});

export const VehiclePanelSchema = z.object({
  vehicleId: uuidField(),
  brand: z.string(),
  model: z.string(),
  productionYear: z.number().int(),
  fuelType: z.enum(FUEL_TYPE_CODES),
  currentMileage: mileageField(),
  currency: currencyCodeField(),
  energy: VehiclePanelEnergySchema.nullable(),
  nextService: VehiclePanelNextServiceSchema.nullable(),
  monthCost: VehiclePanelMonthCostSchema,
  avgConsumption: VehiclePanelConsumptionSchema.nullable(),
});

export type VehiclePanel = z.infer<typeof VehiclePanelSchema>;
