import { createRoute } from '@tanstack/react-router';

import { VehicleDetailPage } from '@/features/vehicles/components/vehicle-detail-hub';
import { VehicleCreatePage, VehicleEditPage } from '@/features/vehicles/components/vehicle-form';
import { VehicleListPage } from '@/features/vehicles/components/vehicle-list';

import { authenticatedLayoutRoute } from '../../_authenticated';

// ─── Parent route: /vehicles ──────────────────────────────────────────────────

const vehicleParentRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/vehicles',
});

// ─── Child routes ──────────────────────────────────────────────────────────────

const vehicleListRoute = createRoute({
  getParentRoute: () => vehicleParentRoute,
  path: '/',
  component: VehicleListPage,
});

const vehicleCreateRoute = createRoute({
  getParentRoute: () => vehicleParentRoute,
  path: '/new',
  component: VehicleCreatePage,
});

const vehicleDetailRoute = createRoute({
  getParentRoute: () => vehicleParentRoute,
  path: '/$vehicleId',
  component: VehicleDetailPage,
});

const vehicleEditRoute = createRoute({
  getParentRoute: () => vehicleDetailRoute,
  path: '/edit',
  component: VehicleEditPage,
});

// ─── Assembled tree ────────────────────────────────────────────────────────────

export const vehiclesRoute = vehicleParentRoute.addChildren([
  vehicleListRoute,
  vehicleCreateRoute,
  vehicleDetailRoute.addChildren([vehicleEditRoute]),
]);
