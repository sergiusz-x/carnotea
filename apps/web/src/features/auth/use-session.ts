import { queryOptions, useQuery } from '@tanstack/react-query';

import { authClient } from '@/lib/auth-client';

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: async () => {
    const result = await authClient.getSession();
    if (result.error) {
      throw new Error(result.error.message ?? 'Session request failed');
    }
    return result.data ?? null;
  },
  // Session is long-lived; invalidate explicitly on sign-in/out rather than
  // relying on staleTime expiry.
  staleTime: Infinity,
  retry: false,
});

export function useSession() {
  return useQuery(sessionQueryOptions);
}
