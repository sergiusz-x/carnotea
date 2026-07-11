import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ServiceDetailPage } from '@/features/service/components/service-detail';

export function createServiceDetailRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/service/$recordId',
    component: ServiceDetailPage,
  });
}
