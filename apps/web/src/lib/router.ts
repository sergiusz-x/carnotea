import { createRouter } from '@tanstack/react-router';

import { healthRoute } from '@/features/health/routes';
import { authenticatedLayoutRoute } from '@/routes/_authenticated';
import { dashboardRoute } from '@/routes/_authenticated/dashboard';
import { profileRoute } from '@/routes/_authenticated/profile';
import { vehiclesRoute } from '@/routes/_authenticated/vehicles';
import { indexRoute } from '@/routes/index';
import { loginRoute } from '@/routes/login';
import { rootRoute } from '@/routes/root';

import { queryClient } from './queryClient';

const routeTree = rootRoute.addChildren([
  indexRoute,
  authenticatedLayoutRoute.addChildren([vehiclesRoute, dashboardRoute, profileRoute]),
  loginRoute,
  healthRoute,
]);

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
