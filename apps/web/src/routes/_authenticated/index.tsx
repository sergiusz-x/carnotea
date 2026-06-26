import { createRoute } from '@tanstack/react-router';

import { DashboardPage } from '@/features/dashboard/components/dashboard-page';

import { authenticatedLayoutRoute } from '../_authenticated';

export const authenticatedIndexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/',
  component: DashboardPage,
});
