import { ROUTES } from '@carnotea/shared';
import { createRoute } from '@tanstack/react-router';

import { rootRoute } from '@/routes/root';

import { HealthStatus } from './HealthStatus';
import { healthQueryOptions } from './queries';

export const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.healthz,
  // Warm the cache without throwing on failure, so a down API
  // still renders HealthStatus (which surfaces the error as "down") instead of
  // the router's error boundary.
  loader: ({ context }) => context.queryClient.query(healthQueryOptions).catch(() => undefined),
  component: HealthStatus,
});
