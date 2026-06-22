import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ChargingCreatePage } from '@/features/charging/components/charging-form';

export function createChargingNewRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/charging/new',
    component: ChargingCreatePage,
  });
}
