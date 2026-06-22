import { type UserProfileUpdate } from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const profileKeys = {
  me: () => ['me'] as const,
};

// ─── Fetch function ────────────────────────────────────────────────────────────

async function fetchProfile() {
  const { data } = await apiClient.GET('/api/me');
  return data;
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: profileKeys.me(),
      });
    },
  });
}
