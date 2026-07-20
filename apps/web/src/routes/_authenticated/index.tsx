import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { authenticatedLayoutRoute } from '../_authenticated';

export const authenticatedIndexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/',
  component: lazyRouteComponent(
    () => import('@/features/dashboard/components/dashboard-page'),
    'DashboardPage',
  ),
});
