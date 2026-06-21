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
} as const;
