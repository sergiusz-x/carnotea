import { createRoute, lazyRouteComponent } from '@tanstack/react-router';

import { profileQueryOptions } from '@/features/profile/queries';

import { authenticatedLayoutRoute } from '../_authenticated';

export const profileRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/profile',
  loader: ({ context }) => context.queryClient.prefetchQuery(profileQueryOptions),
  component: lazyRouteComponent(
    () => import('@/features/profile/components/profile-screen'),
    'ProfileScreen',
  ),
});
