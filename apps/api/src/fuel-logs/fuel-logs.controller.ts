import {
  ErrorResponseSchema,
  FuelLogCreateSchema,
  FuelLogUpdateSchema,
  ROUTES,
  type FuelLogCreate,
  type FuelLogUpdate,
} from '@carnotea/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard } from '../auth/auth.guard.js';
import { type AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { zodRoute, ZodValidationPipe } from '../lib/openapi/index.js';

import { FuelLogsService, type FuelLogResponse } from './fuel-logs.service.js';

const vehicleIdParam = z.object({ vehicleId: z.uuid() });
const fuelLogIdParam = z.object({ vehicleId: z.uuid(), id: z.uuid() });
const vehicleIdPipe = new ZodValidationPipe(z.uuid());
const idPipe = new ZodValidationPipe(z.uuid());
const fuelLogsByVehicleNestPath = ROUTES.fuelLogsByVehicle
  .replace('{vehicleId}', ':vehicleId')
  .slice(1);
const fuelLogByIdNestPath = ROUTES.fuelLogById
  .replace('{vehicleId}', ':vehicleId')
  .replace('{id}', ':id')
  .slice(1);

const FuelLogResponseSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  fuelDate: z.iso.date(),
  mileage: z.number().int().nonnegative(),
  liters: z.number().positive(),
  pricePerLiter: z.number().positive(),
  totalCost: z.number().nonnegative(),
  stationName: z.string().max(120).nullable(),
  isFullTank: z.boolean(),
  consumptionHint: z.number().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

zodRoute({
  method: 'get',
  path: ROUTES.fuelLogsByVehicle,
  operationId: 'listFuelLogs',
  summary: "List an owned vehicle's fuel logs, newest first",
  tags: ['Fuel Logs'],
  request: { params: vehicleIdParam },
  responses: {
    '200': { description: 'Fuel logs for the vehicle', schema: z.array(FuelLogResponseSchema) },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.fuelLogById,
  operationId: 'getFuelLog',
  summary: 'Get one fuel log',
  tags: ['Fuel Logs'],
  request: { params: fuelLogIdParam },
  responses: {
    '200': { description: 'The fuel log', schema: FuelLogResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Fuel log not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'post',
  path: ROUTES.fuelLogsByVehicle,
  operationId: 'createFuelLog',
  summary: 'Create a fuel log',
  tags: ['Fuel Logs'],
  request: { params: vehicleIdParam, body: FuelLogCreateSchema },
  responses: {
    '201': { description: 'The created fuel log', schema: FuelLogResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'patch',
  path: ROUTES.fuelLogById,
  operationId: 'updateFuelLog',
  summary: 'Update a fuel log',
  tags: ['Fuel Logs'],
  request: { params: fuelLogIdParam, body: FuelLogUpdateSchema },
  responses: {
    '200': { description: 'The updated fuel log', schema: FuelLogResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Fuel log not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'delete',
  path: ROUTES.fuelLogById,
  operationId: 'deleteFuelLog',
  summary: 'Delete a fuel log',
  tags: ['Fuel Logs'],
  request: { params: fuelLogIdParam },
  responses: {
    '204': { description: 'Deleted' },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Fuel log not found', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class FuelLogsController {
  constructor(private readonly fuelLogs: FuelLogsService) {}

  @Get(fuelLogsByVehicleNestPath)
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
  ): Promise<FuelLogResponse[]> {
    return this.fuelLogs.list(user.id, vehicleId);
  }

  @Get(fuelLogByIdNestPath)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<FuelLogResponse> {
    return this.fuelLogs.getOwnedOrThrow(user.id, vehicleId, id);
  }

  @Post(fuelLogsByVehicleNestPath)
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Body(new ZodValidationPipe(FuelLogCreateSchema)) body: FuelLogCreate,
  ): Promise<FuelLogResponse> {
    return this.fuelLogs.create(user.id, vehicleId, body);
  }

  @Patch(fuelLogByIdNestPath)
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(FuelLogUpdateSchema)) body: FuelLogUpdate,
  ): Promise<FuelLogResponse> {
    return this.fuelLogs.update(user.id, vehicleId, id, body);
  }

  @Delete(fuelLogByIdNestPath)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.fuelLogs.remove(user.id, vehicleId, id);
  }
}
