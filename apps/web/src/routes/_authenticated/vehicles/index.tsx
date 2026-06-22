import { createRoute } from '@tanstack/react-router';

import { VehicleDetailPage } from '@/features/vehicles/components/vehicle-detail-hub';
import { VehicleCreatePage, VehicleEditPage } from '@/features/vehicles/components/vehicle-form';
import { VehicleListPage } from '@/features/vehicles/components/vehicle-list';

import { authenticatedLayoutRoute } from '../../_authenticated';

import { createFuelLogRoutes } from './$vehicleId/fuel/$fuelId/index';
import { createFuelListRoute } from './$vehicleId/fuel/index';
import { createFuelNewRoute } from './$vehicleId/fuel/new';
import { createIssueEditRoute } from './$vehicleId/issues/$issueId/edit';
import { createIssueDetailRoute } from './$vehicleId/issues/$issueId/index';
import { createIssueListRoute } from './$vehicleId/issues/index';
import { createIssueNewRoute } from './$vehicleId/issues/new';

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

export const vehicleDetailRoute = createRoute({
  getParentRoute: () => vehicleParentRoute,
  path: '/$vehicleId',
  component: VehicleDetailPage,
});

const vehicleEditRoute = createRoute({
  getParentRoute: () => vehicleDetailRoute,
  path: '/edit',
  component: VehicleEditPage,
});

// ─── Fuel routes (factories, no circular import) ───────────────────────────────

const fuelListRoute = createFuelListRoute(vehicleDetailRoute);
const fuelNewRoute = createFuelNewRoute(vehicleDetailRoute);
const { fuelDetailParentRouteNode } = createFuelLogRoutes(vehicleDetailRoute);

// ─── Issue routes (factories, no circular import) ──────────────────────────────

const issueListRoute = createIssueListRoute(vehicleDetailRoute);
const issueNewRoute = createIssueNewRoute(vehicleDetailRoute);
const issueDetailRoute = createIssueDetailRoute(vehicleDetailRoute);
const issueEditRoute = createIssueEditRoute(vehicleDetailRoute);

// ─── Assembled tree ────────────────────────────────────────────────────────────

export const vehiclesRoute = vehicleParentRoute.addChildren([
  vehicleListRoute,
  vehicleCreateRoute,
  vehicleDetailRoute.addChildren([
    vehicleEditRoute,
    fuelListRoute,
    fuelNewRoute,
    fuelDetailParentRouteNode,
    issueListRoute,
    issueNewRoute,
    issueDetailRoute,
    issueEditRoute,
  ]),
]);
