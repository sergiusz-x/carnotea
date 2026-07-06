import {
  LocaleCode,
  UserProfileSchema,
  UnitsCode,
  type UserProfile,
  type UserProfileUpdate,
} from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const profileKeys = {
  me: () => ['me'] as const,
};

const legacyUserProfileSchema = z
  .object({
    id: z.uuid(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.email(),
    locale_pref: LocaleCode,
    units_pref: UnitsCode,
    currency_pref: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((profile) => ({
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    localePref: profile.locale_pref,
    unitsPref: profile.units_pref,
    currencyPref: profile.currency_pref,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }))
  .pipe(UserProfileSchema);

const userProfileWireSchema = z.union([UserProfileSchema, legacyUserProfileSchema]);

function parseProfile(data: unknown): UserProfile {
  return userProfileWireSchema.parse(data);
}

// ─── Fetch function ────────────────────────────────────────────────────────────

async function fetchProfile() {
  const { data } = await apiClient.GET('/api/me');
  return parseProfile(data);
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const profileQueryOptions = queryOptions({
  queryKey: profileKeys.me(),
  queryFn: fetchProfile,
});

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UserProfileUpdate) => apiClient.PATCH('/api/me', body),
    onSuccess: async ({ data }) => {
      queryClient.setQueryData(profileKeys.me(), parseProfile(data));
      await queryClient.invalidateQueries({
        queryKey: profileKeys.me(),
      });
    },
  });
}
