import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { authenticatedLayoutRoute } from '../_authenticated';

export const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/dashboard',
  component: lazyRouteComponent(
    () => import('@/features/dashboard/components/dashboard-page'),
    'DashboardPage',
  ),
});
