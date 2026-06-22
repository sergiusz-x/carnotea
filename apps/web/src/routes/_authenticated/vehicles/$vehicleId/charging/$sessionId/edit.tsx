import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ChargingEditPage } from '@/features/charging/components/charging-form';

export function createChargingEditRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/charging/$sessionId/edit',
    component: ChargingEditPage,
  });
}