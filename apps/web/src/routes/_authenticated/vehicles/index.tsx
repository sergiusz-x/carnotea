import { createRoute, lazyRouteComponent, Outlet } from '@tanstack/react-router';

import { authenticatedLayoutRoute } from '../../_authenticated';

import { createChargingEditRoute } from './$vehicleId/charging/$sessionId/edit';
import { createChargingListRoute } from './$vehicleId/charging/index';
import { createChargingNewRoute } from './$vehicleId/charging/new';
import { createExpenseEditRoute } from './$vehicleId/expenses/$expenseId/edit';
import { createExpenseDetailRoute } from './$vehicleId/expenses/$expenseId/index';
import { createExpenseListRoute } from './$vehicleId/expenses/index';
import { createExpenseNewRoute } from './$vehicleId/expenses/new';
import { createFluidLogEditRoute } from './$vehicleId/fluid-logs/$logId/edit';
import { createFluidLogListRoute } from './$vehicleId/fluid-logs/index';
import { createFluidLogNewRoute } from './$vehicleId/fluid-logs/new';
import { createFuelLogRoutes } from './$vehicleId/fuel/$fuelId/index';
import { createFuelListRoute } from './$vehicleId/fuel/index';
import { createFuelNewRoute } from './$vehicleId/fuel/new';
import { createIssueEditRoute } from './$vehicleId/issues/$issueId/edit';
import { createIssueDetailRoute } from './$vehicleId/issues/$issueId/index';
import { createIssueListRoute } from './$vehicleId/issues/index';
import { createIssueNewRoute } from './$vehicleId/issues/new';
import { createReminderEditRoute } from './$vehicleId/reminders/$reminderId/edit';
import { createReminderDetailRoute } from './$vehicleId/reminders/$reminderId/index';
import { createReminderListRoute } from './$vehicleId/reminders/index';
import { createReminderNewRoute } from './$vehicleId/reminders/new';
import { createServiceEditRoute } from './$vehicleId/service/$recordId/edit';
import { createServiceDetailRoute } from './$vehicleId/service/$recordId/index';
import { createServiceListRoute } from './$vehicleId/service/index';
import { createServiceNewRoute } from './$vehicleId/service/new';

function VehicleDetailOutlet() {
  return <Outlet />;
}

const vehicleParentRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/vehicles',
});

const vehicleListRoute = createRoute({
  getParentRoute: () => vehicleParentRoute,
  path: '/',
  component: lazyRouteComponent(
    () => import('@/features/vehicles/components/vehicle-list'),
    'VehicleListPage',
  ),
});

const vehicleCreateRoute = createRoute({
  getParentRoute: () => vehicleParentRoute,
  path: '/new',
  component: lazyRouteComponent(
    () => import('@/features/vehicles/components/vehicle-form'),
    'VehicleCreatePage',
  ),
});

export const vehicleDetailRoute = createRoute({
  getParentRoute: () => vehicleParentRoute,
  path: '/$vehicleId',
  component: VehicleDetailOutlet,
});

const vehicleDetailIndexRoute = createRoute({
  getParentRoute: () => vehicleDetailRoute,
  path: '/',
  component: lazyRouteComponent(
    () => import('@/features/vehicles/components/vehicle-detail-hub'),
    'VehicleDetailPage',
  ),
});

const vehicleEditRoute = createRoute({
  getParentRoute: () => vehicleDetailRoute,
  path: '/edit',
  component: lazyRouteComponent(
    () => import('@/features/vehicles/components/vehicle-form'),
    'VehicleEditPage',
  ),
});

const fuelListRoute = createFuelListRoute(vehicleDetailRoute);
const fuelNewRoute = createFuelNewRoute(vehicleDetailRoute);
const { fuelDetailParentRouteNode } = createFuelLogRoutes(vehicleDetailRoute);

const issueListRoute = createIssueListRoute(vehicleDetailRoute);
const issueNewRoute = createIssueNewRoute(vehicleDetailRoute);
const issueDetailRoute = createIssueDetailRoute(vehicleDetailRoute);
const issueEditRoute = createIssueEditRoute(vehicleDetailRoute);

const reminderListRoute = createReminderListRoute(vehicleDetailRoute);
const reminderNewRoute = createReminderNewRoute(vehicleDetailRoute);
const reminderDetailRoute = createReminderDetailRoute(vehicleDetailRoute);
const reminderEditRoute = createReminderEditRoute(vehicleDetailRoute);

const chargingListRoute = createChargingListRoute(vehicleDetailRoute);
const chargingNewRoute = createChargingNewRoute(vehicleDetailRoute);
const chargingEditRoute = createChargingEditRoute(vehicleDetailRoute);

const fluidLogListRoute = createFluidLogListRoute(vehicleDetailRoute);
const fluidLogNewRoute = createFluidLogNewRoute(vehicleDetailRoute);
const fluidLogEditRoute = createFluidLogEditRoute(vehicleDetailRoute);

const expenseListRoute = createExpenseListRoute(vehicleDetailRoute);
const expenseNewRoute = createExpenseNewRoute(vehicleDetailRoute);
const expenseDetailRoute = createExpenseDetailRoute(vehicleDetailRoute);
const expenseEditRoute = createExpenseEditRoute(vehicleDetailRoute);

const serviceListRoute = createServiceListRoute(vehicleDetailRoute);
const serviceNewRoute = createServiceNewRoute(vehicleDetailRoute);
const serviceDetailRoute = createServiceDetailRoute(vehicleDetailRoute);
const serviceEditRoute = createServiceEditRoute(vehicleDetailRoute);

export const vehiclesRoute = vehicleParentRoute.addChildren([
  vehicleListRoute,
  vehicleCreateRoute,
  vehicleDetailRoute.addChildren([
    vehicleDetailIndexRoute,
    vehicleEditRoute,
    fuelListRoute,
    fuelNewRoute,
    fuelDetailParentRouteNode,
    issueListRoute,
    issueNewRoute,
    issueDetailRoute,
    issueEditRoute,
    reminderListRoute,
    reminderNewRoute,
    reminderDetailRoute,
    reminderEditRoute,
    chargingListRoute,
    chargingNewRoute,
    chargingEditRoute,
    fluidLogListRoute,
    fluidLogNewRoute,
    fluidLogEditRoute,
    expenseListRoute,
    expenseNewRoute,
    expenseDetailRoute,
    expenseEditRoute,
    serviceListRoute,
    serviceNewRoute,
    serviceDetailRoute,
    serviceEditRoute,
  ]),
]);
