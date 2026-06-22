import {
  ErrorResponseSchema,
  ROUTES,
  ServiceRecordCreateSchema,
  ServiceRecordUpdateSchema,
  ServicePartLineResponseSchema,
  type ServiceRecordCreate,
  type ServiceRecordUpdate,
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

import { ServiceRecordsService, type ServiceRecordResponse } from './service-records.service.js';

const vehicleIdParam = z.object({ vehicleId: z.uuid() });
const serviceRecordIdParam = z.object({ vehicleId: z.uuid(), id: z.uuid() });
const vehicleIdPipe = new ZodValidationPipe(z.uuid());
const idPipe = new ZodValidationPipe(z.uuid());
const serviceRecordsByVehicleNestPath = ROUTES.serviceRecordsByVehicle
  .replace('{vehicleId}', ':vehicleId')
  .slice(1);
const serviceRecordByIdNestPath = ROUTES.serviceRecordById
  .replace('{vehicleId}', ':vehicleId')
  .replace('{id}', ':id')
  .slice(1);

const ServiceRecordResponseSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  serviceDate: z.iso.date(),
  mileage: z.number().int().nonnegative(),
  title: z.string().min(1).max(160),
  description: z.string().nullable(),
  laborCost: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  workshopName: z.string().max(160).nullable(),
  parts: z.array(ServicePartLineResponseSchema),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

zodRoute({
  method: 'get',
  path: ROUTES.serviceRecordsByVehicle,
  operationId: 'listServiceRecords',
  summary: "List an owned vehicle's service records, newest first",
  tags: ['Service Records'],
  request: { params: vehicleIdParam },
  responses: {
    '200': {
      description: 'Service records for the vehicle',
      schema: z.array(ServiceRecordResponseSchema),
    },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.serviceRecordById,
  operationId: 'getServiceRecord',
  summary: 'Get one service record with its parts',
  tags: ['Service Records'],
  request: { params: serviceRecordIdParam },
  responses: {
    '200': { description: 'The service record with parts', schema: ServiceRecordResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Service record not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'post',
  path: ROUTES.serviceRecordsByVehicle,
  operationId: 'createServiceRecord',
  summary: 'Create a service record, optionally with parts',
  tags: ['Service Records'],
  request: { params: vehicleIdParam, body: ServiceRecordCreateSchema },
  responses: {
    '201': { description: 'The created service record', schema: ServiceRecordResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
    '409': { description: 'Conflict (duplicate part line)', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'patch',
  path: ROUTES.serviceRecordById,
  operationId: 'updateServiceRecord',
  summary: 'Update a service record (does not modify parts)',
  tags: ['Service Records'],
  request: { params: serviceRecordIdParam, body: ServiceRecordUpdateSchema },
  responses: {
    '200': { description: 'The updated service record', schema: ServiceRecordResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Service record not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'delete',
  path: ROUTES.serviceRecordById,
  operationId: 'deleteServiceRecord',
  summary: 'Delete a service record and its parts',
  tags: ['Service Records'],
  request: { params: serviceRecordIdParam },
  responses: {
    '204': { description: 'Deleted' },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Service record not found', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class ServiceRecordsController {
  constructor(private readonly serviceRecords: ServiceRecordsService) {}

  @Get(serviceRecordsByVehicleNestPath)
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
  ): Promise<ServiceRecordResponse[]> {
    return this.serviceRecords.list(user.id, vehicleId);
  }

  @Get(serviceRecordByIdNestPath)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<ServiceRecordResponse> {
    return this.serviceRecords.getOwnedOrThrow(user.id, vehicleId, id);
  }

  @Post(serviceRecordsByVehicleNestPath)
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Body(new ZodValidationPipe(ServiceRecordCreateSchema)) body: ServiceRecordCreate,
  ): Promise<ServiceRecordResponse> {
    return this.serviceRecords.create(user.id, vehicleId, body);
  }

  @Patch(serviceRecordByIdNestPath)
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(ServiceRecordUpdateSchema)) body: ServiceRecordUpdate,
  ): Promise<ServiceRecordResponse> {
    return this.serviceRecords.update(user.id, vehicleId, id, body);
  }

  @Delete(serviceRecordByIdNestPath)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.serviceRecords.remove(user.id, vehicleId, id);
  }
}
