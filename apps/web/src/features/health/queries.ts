import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

const healthSchema = z.object({
  status: z.string(),
});

export type Health = z.infer<typeof healthSchema>;

// Same-origin relative path: the Vite dev server proxies `/healthz` to the API
// (see vite.config.ts); in production the reverse proxy fronts both tiers.
async function fetchHealth(): Promise<Health> {
  const res = await fetch('/healthz');

  if (!res.ok) {
    throw new Error(`Health check failed: ${String(res.status)}`);
  }

  return healthSchema.parse(await res.json());
}

export const healthQueryOptions = queryOptions({
  queryKey: ['health'],
  queryFn: fetchHealth,
});
