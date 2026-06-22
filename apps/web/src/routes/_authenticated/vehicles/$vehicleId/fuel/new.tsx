import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { FuelLogCreatePage } from '@/features/fuel/components/fuel-log-form';

export function createFuelNewRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/fuel/new',
    component: FuelLogCreatePage,
  });
}