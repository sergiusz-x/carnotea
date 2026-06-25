import { z } from 'zod';

import { ZodValidationPipe } from './openapi/index.js';

export const vehicleIdParam = z.object({ vehicleId: z.uuid() });
export const resourceWithVehicleParam = z.object({ vehicleId: z.uuid(), id: z.uuid() });
export const vehicleIdPipe = new ZodValidationPipe(z.uuid());
export const idPipe = new ZodValidationPipe(z.uuid());

export function nestListPath(route: string): string {
  return route.replace('{vehicleId}', ':vehicleId').slice(1);
}

export function nestDetailPath(route: string): string {
  return route.replace('{vehicleId}', ':vehicleId').replace('{id}', ':id').slice(1);
}
