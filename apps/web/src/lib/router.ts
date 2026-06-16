import { createRouter } from '@tanstack/react-router';

import { healthRoute } from '@/features/health/routes';
import { indexRoute } from '@/routes/index';
import { rootRoute } from '@/routes/root';

import { queryClient } from './queryClient';

const routeTree = rootRoute.addChildren([indexRoute, healthRoute]);

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
