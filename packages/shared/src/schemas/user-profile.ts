import { z } from 'zod';

import { timestampField, uuidField } from './_shared.js';

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
  createdAt: timestampField(),
  updatedAt: timestampField(),
});

export const UserProfileSchema = userProfileFields;

export const UserProfileCreateSchema = userProfileFields.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UserProfileUpdateSchema = UserProfileCreateSchema.partial();

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserProfileCreate = z.infer<typeof UserProfileCreateSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
