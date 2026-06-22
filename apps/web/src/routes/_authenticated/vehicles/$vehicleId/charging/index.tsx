import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ChargingListPage } from '@/features/charging/components/charging-list';

export function createChargingListRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/charging',
    component: ChargingListPage,
  });
}