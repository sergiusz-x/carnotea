import { createRoute } from '@tanstack/react-router';

import { authenticatedLayoutRoute } from '../_authenticated';

export const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/dashboard',
  component: DashboardPlaceholder,
});

function DashboardPlaceholder() {
  return <div />;
}
