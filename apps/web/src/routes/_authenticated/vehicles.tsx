import { createRoute } from '@tanstack/react-router';

import { authenticatedLayoutRoute } from '../_authenticated';

export const vehiclesRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/vehicles',
  component: VehiclesPlaceholder,
});

function VehiclesPlaceholder() {
  return <div />;
}
