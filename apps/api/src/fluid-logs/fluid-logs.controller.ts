import {
  ErrorResponseSchema,
  FluidLogCreateSchema,
  FluidLogUpdateSchema,
  ROUTES,
  type FluidLogCreate,
  type FluidLogUpdate,
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
import {
  idPipe,
  nestDetailPath,
  nestListPath,
  resourceWithVehicleParam,
  vehicleIdParam,
  vehicleIdPipe,
} from '../lib/route-params.js';

import { FluidLogsService, type FluidLogResponse } from './fluid-logs.service.js';

const fluidLogsByVehicleNestPath = nestListPath(ROUTES.fluidLogsByVehicle);
const fluidLogByIdNestPath = nestDetailPath(ROUTES.fluidLogById);
const fluidLogIdParam = resourceWithVehicleParam;

const FluidLogResponseSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  changeDate: z.iso.date(),
  mileage: z.number().int().nonnegative(),
  fluidType: z.string(),
  quantityLiters: z.number().positive().nullable(),
  cost: z.number().nonnegative().nullable(),
  intervalKm: z.number().int().positive().nullable(),
  intervalMonths: z.number().int().positive().nullable(),
  workshopName: z.string().max(120).nullable(),
  notes: z.string().max(2000).nullable(),
  nextDueMileage: z.number().int().nonnegative().nullable(),
  nextDueDate: z.iso.date().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

zodRoute({
  method: 'get',
  path: ROUTES.fluidLogsByVehicle,
  operationId: 'listFluidLogs',
  summary: "List an owned vehicle's fluid changes, newest first",
  tags: ['Fluid Logs'],
  request: { params: vehicleIdParam },
  responses: {
    '200': { description: 'Fluid logs for the vehicle', schema: z.array(FluidLogResponseSchema) },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.fluidLogById,
  operationId: 'getFluidLog',
  summary: 'Get one fluid log',
  tags: ['Fluid Logs'],
  request: { params: fluidLogIdParam },
  responses: {
    '200': { description: 'The fluid log', schema: FluidLogResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Fluid log not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'post',
  path: ROUTES.fluidLogsByVehicle,
  operationId: 'createFluidLog',
  summary: 'Create a fluid log',
  tags: ['Fluid Logs'],
  request: { params: vehicleIdParam, body: FluidLogCreateSchema },
  responses: {
    '201': { description: 'The created fluid log', schema: FluidLogResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'patch',
  path: ROUTES.fluidLogById,
  operationId: 'updateFluidLog',
  summary: 'Update a fluid log',
  tags: ['Fluid Logs'],
  request: { params: fluidLogIdParam, body: FluidLogUpdateSchema },
  responses: {
    '200': { description: 'The updated fluid log', schema: FluidLogResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Fluid log not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'delete',
  path: ROUTES.fluidLogById,
  operationId: 'deleteFluidLog',
  summary: 'Delete a fluid log',
  tags: ['Fluid Logs'],
  request: { params: fluidLogIdParam },
  responses: {
    '204': { description: 'Deleted' },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Fluid log not found', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class FluidLogsController {
  constructor(private readonly fluidLogs: FluidLogsService) {}

  @Get(fluidLogsByVehicleNestPath)
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
  ): Promise<FluidLogResponse[]> {
    return this.fluidLogs.list(user.id, vehicleId);
  }

  @Get(fluidLogByIdNestPath)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<FluidLogResponse> {
    return this.fluidLogs.getOwnedOrThrow(user.id, vehicleId, id);
  }

  @Post(fluidLogsByVehicleNestPath)
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Body(new ZodValidationPipe(FluidLogCreateSchema)) body: FluidLogCreate,
  ): Promise<FluidLogResponse> {
    return this.fluidLogs.create(user.id, vehicleId, body);
  }

  @Patch(fluidLogByIdNestPath)
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(FluidLogUpdateSchema)) body: FluidLogUpdate,
  ): Promise<FluidLogResponse> {
    return this.fluidLogs.update(user.id, vehicleId, id, body);
  }

  @Delete(fluidLogByIdNestPath)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.fluidLogs.remove(user.id, vehicleId, id);
  }
}
