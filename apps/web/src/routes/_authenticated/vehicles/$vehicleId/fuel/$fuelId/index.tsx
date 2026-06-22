import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { FuelLogDetailPage } from '@/features/fuel/components/fuel-log-detail';
import { FuelLogEditPage } from '@/features/fuel/components/fuel-log-form';

export function createFuelLogRoutes(parentRoute: AnyRoute) {
  const fuelDetailParentRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/fuel/$fuelId',
  });

  const fuelDetailRoute = createRoute({
    getParentRoute: () => fuelDetailParentRoute,
    path: '/',
    component: FuelLogDetailPage,
  });

  const fuelEditRoute = createRoute({
    getParentRoute: () => fuelDetailParentRoute,
    path: '/edit',
    component: FuelLogEditPage,
  });

  const fuelDetailParentRouteNode = fuelDetailParentRoute.addChildren([
    fuelDetailRoute,
    fuelEditRoute,
  ]);

  return { fuelDetailParentRouteNode };
}
