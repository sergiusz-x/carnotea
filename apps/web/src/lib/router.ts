import { createRouter } from '@tanstack/react-router';

import { healthRoute } from '@/features/health/routes';
import { authenticatedLayoutRoute } from '@/routes/_authenticated';
import { dashboardRoute } from '@/routes/_authenticated/dashboard';
import { authenticatedIndexRoute } from '@/routes/_authenticated/index';
import { profileRoute } from '@/routes/_authenticated/profile';
import { vehiclesRoute } from '@/routes/_authenticated/vehicles';
import { loginRoute } from '@/routes/login';
import { rootRoute } from '@/routes/root';

import { queryClient } from './queryClient';

const routeTree = rootRoute.addChildren([
  authenticatedLayoutRoute.addChildren([
    authenticatedIndexRoute,
    vehiclesRoute,
    dashboardRoute,
    profileRoute,
  ]),
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
