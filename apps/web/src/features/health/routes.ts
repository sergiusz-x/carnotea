import { createRoute } from '@tanstack/react-router';

import { rootRoute } from '@/routes/root';

import { HealthStatus } from './HealthStatus';
import { healthQueryOptions } from './queries';

export const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/healthz',
  loader: ({ context }) => context.queryClient.ensureQueryData(healthQueryOptions),
  component: HealthStatus,
});
