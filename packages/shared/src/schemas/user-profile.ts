import { z } from 'zod';

import { currencyCodeField, timestampField, uuidField } from './_shared.js';

/** Valid locale values (Polish / English). */
export const LocaleCode = z.enum(['pl', 'en']);

/** Valid display-unit values (metric / imperial). */
export const UnitsCode = z.enum(['metric', 'imperial']);

/**
 * User profile (`vehicle_diary.users`). The DB stores `email` lower-cased and
 * `@`-validated; the contract normalizes to match. The profile is linked to the
 * better-auth identity in T-006.
 */
const userProfileFields = z.object({
  id: uuidField(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.email().max(255).toLowerCase(),
  localePref: LocaleCode,
  unitsPref: UnitsCode,
  currencyPref: currencyCodeField(),
  createdAt: timestampField(),
  updatedAt: timestampField(),
});

export const UserProfileSchema = userProfileFields;

export const UserProfileCreateSchema = userProfileFields.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UserProfileUpdateSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  localePref: LocaleCode.optional(),
  unitsPref: UnitsCode.optional(),
  currencyPref: currencyCodeField().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserProfileCreate = z.infer<typeof UserProfileCreateSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
