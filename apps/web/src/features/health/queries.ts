import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

// Mirrors the API contract (apps/api/src/health/health.controller.ts): any
// response that isn't exactly `{ status: 'ok' }` fails validation and is
// surfaced as "down".
const healthSchema = z.object({
  status: z.literal('ok'),
});

// Same-origin relative path: the Vite dev server proxies `/healthz` to the API
// (see vite.config.ts); in production the reverse proxy fronts both tiers.
async function fetchHealth(): Promise<z.infer<typeof healthSchema>> {
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
