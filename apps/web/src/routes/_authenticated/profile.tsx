import { createRoute } from '@tanstack/react-router';


import { ProfileScreen } from '@/features/profile/components/profile-screen';
import { profileQueryOptions } from '@/features/profile/queries';

import { authenticatedLayoutRoute } from '../_authenticated';

export const profileRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/profile',
  loader: ({ context }) => context.queryClient.prefetchQuery(profileQueryOptions),
  component: ProfileScreen,
});
