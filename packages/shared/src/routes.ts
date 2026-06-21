/**
 * Single source of truth for API endpoint paths.
 * All NestJS controllers and frontend code should import from here.
 */
export const ROUTES = {
  healthz: '/healthz',
  readyz: '/readyz',
  vehicles: '/vehicles',
  vehicleById: '/vehicles/{id}',
  me: '/me',
  fuelLogsByVehicle: '/vehicles/{vehicleId}/fuel-logs',
  fuelLogById: '/vehicles/{vehicleId}/fuel-logs/{id}',
} as const;
