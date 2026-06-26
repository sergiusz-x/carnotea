import { createRoute } from '@tanstack/react-router';

import { DashboardPage } from '@/features/dashboard/components/dashboard-page';

import { authenticatedLayoutRoute } from '../_authenticated';

export const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
});
