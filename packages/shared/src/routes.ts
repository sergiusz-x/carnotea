/**
 * Single source of truth for API endpoint paths.
 * All NestJS controllers and frontend code should import from here.
 */
export const ROUTES = {
  healthz: '/healthz',
  readyz: '/readyz',
  vehicles: '/api/vehicles',
  vehicleById: '/api/vehicles/{id}',
  me: '/api/me',
  meExport: '/api/me/export',
  fuelLogsByVehicle: '/api/vehicles/{vehicleId}/fuel-logs',
  fuelLogById: '/api/vehicles/{vehicleId}/fuel-logs/{id}',
  remindersByVehicle: '/api/vehicles/{vehicleId}/reminders',
  reminderById: '/api/vehicles/{vehicleId}/reminders/{id}',
  mileageReadingsByVehicle: '/api/vehicles/{vehicleId}/mileage-readings',
  mileageReadingById: '/api/vehicles/{vehicleId}/mileage-readings/{id}',
  chargingSessionsByVehicle: '/api/vehicles/{vehicleId}/charging-sessions',
  chargingSessionById: '/api/vehicles/{vehicleId}/charging-sessions/{id}',
  fluidLogsByVehicle: '/api/vehicles/{vehicleId}/fluid-logs',
  fluidLogById: '/api/vehicles/{vehicleId}/fluid-logs/{id}',
  issuesByVehicle: '/api/vehicles/{vehicleId}/issues',
  issueById: '/api/vehicles/{vehicleId}/issues/{id}',
  serviceRecordsByVehicle: '/api/vehicles/{vehicleId}/service-records',
  serviceRecordById: '/api/vehicles/{vehicleId}/service-records/{id}',
  expensesByVehicle: '/api/vehicles/{vehicleId}/expenses',
  expenseById: '/api/vehicles/{vehicleId}/expenses/{id}',

  // Redesign — per-vehicle aggregated read views (T-069)
  vehicleActivity: '/api/vehicles/{vehicleId}/activity',
  vehiclePanel: '/api/vehicles/{vehicleId}/panel',

  // Dashboard (read-only, user-scoped, no vehicleId prefix)
  dashboardOverview: '/api/dashboard/overview',
  dashboardExpensesByCategory: '/api/dashboard/expenses-by-category',
  dashboardMonthlySpend: '/api/dashboard/monthly-spend',
  dashboardUpcomingReminders: '/api/dashboard/upcoming-reminders',
} as const;
