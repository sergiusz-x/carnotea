import {
  ErrorResponseSchema,
  MileageReadingCreateSchema,
  ROUTES,
  type MileageReadingCreate,
} from '@carnotea/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard } from '../auth/auth.guard.js';
import { type AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { zodRoute, ZodValidationPipe } from '../lib/openapi/index.js';

import { MileageReadingsService, type MileageReadingResponse } from './mileage-readings.service.js';

const vehicleIdParam = z.object({ vehicleId: z.uuid() });
const mileageReadingIdParam = z.object({ vehicleId: z.uuid(), id: z.uuid() });
const vehicleIdPipe = new ZodValidationPipe(z.uuid());
const idPipe = new ZodValidationPipe(z.uuid());
const mileageReadingsByVehicleNestPath = ROUTES.mileageReadingsByVehicle
  .replace('{vehicleId}', ':vehicleId')
  .slice(1);
const mileageReadingByIdNestPath = ROUTES.mileageReadingById
  .replace('{vehicleId}', ':vehicleId')
  .replace('{id}', ':id')
  .slice(1);

const MileageReadingResponseSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  readingDate: z.iso.date(),
  mileage: z.number().int().nonnegative(),
  sourceType: z.string(),
  sourceId: z.uuid().nullable(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

zodRoute({
  method: 'get',
  path: ROUTES.mileageReadingsByVehicle,
  operationId: 'listMileageReadings',
  summary: "List an owned vehicle's mileage readings, newest first",
  tags: ['Mileage Readings'],
  request: { params: vehicleIdParam },
  responses: {
    '200': {
      description: 'Mileage readings for the vehicle',
      schema: z.array(MileageReadingResponseSchema),
    },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.mileageReadingById,
  operationId: 'getMileageReading',
  summary: 'Get one mileage reading',
  tags: ['Mileage Readings'],
  request: { params: mileageReadingIdParam },
  responses: {
    '200': { description: 'The mileage reading', schema: MileageReadingResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Mileage reading not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'post',
  path: ROUTES.mileageReadingsByVehicle,
  operationId: 'createMileageReading',
  summary: 'Create a manual mileage reading',
  tags: ['Mileage Readings'],
  request: { params: vehicleIdParam, body: MileageReadingCreateSchema },
  responses: {
    '201': { description: 'The created mileage reading', schema: MileageReadingResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'delete',
  path: ROUTES.mileageReadingById,
  operationId: 'deleteMileageReading',
  summary: 'Delete a mileage reading',
  tags: ['Mileage Readings'],
  request: { params: mileageReadingIdParam },
  responses: {
    '204': { description: 'Deleted' },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Mileage reading not found', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class MileageReadingsController {
  constructor(private readonly mileageReadings: MileageReadingsService) {}

  @Get(mileageReadingsByVehicleNestPath)
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
  ): Promise<MileageReadingResponse[]> {
    return this.mileageReadings.list(user.id, vehicleId);
  }

  @Get(mileageReadingByIdNestPath)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<MileageReadingResponse> {
    return this.mileageReadings.getOwnedOrThrow(user.id, vehicleId, id);
  }

  @Post(mileageReadingsByVehicleNestPath)
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Body(new ZodValidationPipe(MileageReadingCreateSchema)) body: MileageReadingCreate,
  ): Promise<MileageReadingResponse> {
    return this.mileageReadings.create(user.id, vehicleId, body);
  }

  @Delete(mileageReadingByIdNestPath)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.mileageReadings.remove(user.id, vehicleId, id);
  }
}
