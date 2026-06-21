import { createRoute } from '@tanstack/react-router';

import { authenticatedLayoutRoute } from '../_authenticated';

export const profileRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/profile',
  component: ProfilePlaceholder,
});

function ProfilePlaceholder() {
  return <div />;
}
