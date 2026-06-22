import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { FuelLogListPage } from '@/features/fuel/components/fuel-log-list';

export function createFuelListRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/fuel',
    component: FuelLogListPage,
  });
}
