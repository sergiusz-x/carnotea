import {
  ErrorResponseSchema,
  VehicleCreateSchema,
  VehicleSchema,
  VehicleUpdateSchema,
  type Vehicle,
  type VehicleCreate,
  type VehicleUpdate,
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

import { VehiclesService } from './vehicles.service.js';

// OpenAPI path format uses {id}; the NestJS routes below use :id.
const vehicleIdParam = z.object({ id: z.uuid() });
const idPipe = new ZodValidationPipe(z.uuid());

zodRoute({
  method: 'get',
  path: '/vehicles',
  operationId: 'listVehicles',
  summary: "List the authenticated user's vehicles",
  tags: ['Vehicles'],
  responses: {
    '200': { description: "The authenticated user's vehicles", schema: z.array(VehicleSchema) },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: '/vehicles/{id}',
  operationId: 'getVehicle',
  summary: 'Get one owned vehicle',
  tags: ['Vehicles'],
  request: { params: vehicleIdParam },
  responses: {
    '200': { description: 'The vehicle', schema: VehicleSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'post',
  path: '/vehicles',
  operationId: 'createVehicle',
  summary: 'Create a vehicle',
  tags: ['Vehicles'],
  request: { body: VehicleCreateSchema },
  responses: {
    '201': { description: 'The created vehicle', schema: VehicleSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '409': {
      description: 'VIN or registration number already in use',
      schema: ErrorResponseSchema,
    },
  },
});

zodRoute({
  method: 'patch',
  path: '/vehicles/{id}',
  operationId: 'updateVehicle',
  summary: 'Update an owned vehicle',
  tags: ['Vehicles'],
  request: { params: vehicleIdParam, body: VehicleUpdateSchema },
  responses: {
    '200': { description: 'The updated vehicle', schema: VehicleSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
    '409': {
      description: 'VIN or registration number already in use',
      schema: ErrorResponseSchema,
    },
  },
});

zodRoute({
  method: 'delete',
  path: '/vehicles/{id}',
  operationId: 'deleteVehicle',
  summary: 'Delete an owned vehicle',
  tags: ['Vehicles'],
  request: { params: vehicleIdParam },
  responses: {
    '204': { description: 'Deleted' },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get('vehicles')
  list(@CurrentUser() user: AuthUser): Promise<Vehicle[]> {
    return this.vehicles.list(user.id);
  }

  @Get('vehicles/:id')
  getOne(@CurrentUser() user: AuthUser, @Param('id', idPipe) id: string): Promise<Vehicle> {
    return this.vehicles.getOwnedOrThrow(user.id, id);
  }

  @Post('vehicles')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(VehicleCreateSchema)) body: VehicleCreate,
  ): Promise<Vehicle> {
    return this.vehicles.create(user.id, body);
  }

  @Patch('vehicles/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(VehicleUpdateSchema)) body: VehicleUpdate,
  ): Promise<Vehicle> {
    return this.vehicles.update(user.id, id, body);
  }

  @Delete('vehicles/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', idPipe) id: string): Promise<void> {
    return this.vehicles.remove(user.id, id);
  }
}
