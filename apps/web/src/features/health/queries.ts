import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { apiClient } from '@/lib/api/client';

type HealthResponse = Awaited<ReturnType<typeof apiClient.GET<'/healthz'>>>['data'];

const healthSchema = z.object({ status: z.literal('ok') }) satisfies z.ZodType<HealthResponse>;

async function fetchHealth() {
  const { data } = await apiClient.GET('/healthz');
  return healthSchema.parse(data);
}

export const healthQueryOptions = queryOptions({
  queryKey: ['health'],
  queryFn: fetchHealth,
});
