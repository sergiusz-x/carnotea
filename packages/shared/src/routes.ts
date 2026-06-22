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
  fuelLogsByVehicle: '/api/vehicles/{vehicleId}/fuel-logs',
  fuelLogById: '/api/vehicles/{vehicleId}/fuel-logs/{id}',
  remindersByVehicle: '/api/vehicles/{vehicleId}/reminders',
  reminderById: '/api/vehicles/{vehicleId}/reminders/{id}',
  mileageReadingsByVehicle: '/api/vehicles/{vehicleId}/mileage-readings',
  mileageReadingById: '/api/vehicles/{vehicleId}/mileage-readings/{id}',
  chargingSessionsByVehicle: '/api/vehicles/{vehicleId}/charging-sessions',
  chargingSessionById: '/api/vehicles/{vehicleId}/charging-sessions/{id}',
  issuesByVehicle: '/api/vehicles/{vehicleId}/issues',
  issueById: '/api/vehicles/{vehicleId}/issues/{id}',
  serviceRecordsByVehicle: '/api/vehicles/{vehicleId}/service-records',
  serviceRecordById: '/api/vehicles/{vehicleId}/service-records/{id}',
  expensesByVehicle: '/api/vehicles/{vehicleId}/expenses',
  expenseById: '/api/vehicles/{vehicleId}/expenses/{id}',
} as const;
