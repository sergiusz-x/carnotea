import {
  ChargingSessionCreateSchema,
  ChargingSessionUpdateSchema,
  ErrorResponseSchema,
  ROUTES,
  type ChargingSessionCreate,
  type ChargingSessionUpdate,
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

import {
  ChargingSessionsService,
  type ChargingSessionResponse,
} from './charging-sessions.service.js';

const chargingSessionsByVehicleNestPath = nestListPath(ROUTES.chargingSessionsByVehicle);
const chargingSessionByIdNestPath = nestDetailPath(ROUTES.chargingSessionById);
const chargingSessionIdParam = resourceWithVehicleParam;

const ChargingSessionResponseSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  chargeDate: z.iso.date(),
  mileage: z.number().int().nonnegative(),
  energyKwh: z.number().positive(),
  pricePerKwh: z.number().positive(),
  totalCost: z.number().nonnegative(),
  chargerType: z.string(),
  socStartPercent: z.number().int().min(0).max(100).nullable(),
  socEndPercent: z.number().int().min(0).max(100).nullable(),
  stationName: z.string().max(120).nullable(),
  isFullCharge: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
});

zodRoute({
  method: 'get',
  path: ROUTES.chargingSessionsByVehicle,
  operationId: 'listChargingSessions',
  summary: "List an owned vehicle's charging sessions, newest first",
  tags: ['Charging Sessions'],
  request: { params: vehicleIdParam },
  responses: {
    '200': {
      description: 'Charging sessions for the vehicle',
      schema: z.array(ChargingSessionResponseSchema),
    },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.chargingSessionById,
  operationId: 'getChargingSession',
  summary: 'Get one charging session',
  tags: ['Charging Sessions'],
  request: { params: chargingSessionIdParam },
  responses: {
    '200': { description: 'The charging session', schema: ChargingSessionResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Charging session not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'post',
  path: ROUTES.chargingSessionsByVehicle,
  operationId: 'createChargingSession',
  summary: 'Create a charging session',
  tags: ['Charging Sessions'],
  request: { params: vehicleIdParam, body: ChargingSessionCreateSchema },
  responses: {
    '201': { description: 'The created charging session', schema: ChargingSessionResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'patch',
  path: ROUTES.chargingSessionById,
  operationId: 'updateChargingSession',
  summary: 'Update a charging session',
  tags: ['Charging Sessions'],
  request: { params: chargingSessionIdParam, body: ChargingSessionUpdateSchema },
  responses: {
    '200': { description: 'The updated charging session', schema: ChargingSessionResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Charging session not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'delete',
  path: ROUTES.chargingSessionById,
  operationId: 'deleteChargingSession',
  summary: 'Delete a charging session',
  tags: ['Charging Sessions'],
  request: { params: chargingSessionIdParam },
  responses: {
    '204': { description: 'Deleted' },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Charging session not found', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class ChargingSessionsController {
  constructor(private readonly chargingSessions: ChargingSessionsService) {}

  @Get(chargingSessionsByVehicleNestPath)
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
  ): Promise<ChargingSessionResponse[]> {
    return this.chargingSessions.list(user.id, vehicleId);
  }

  @Get(chargingSessionByIdNestPath)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<ChargingSessionResponse> {
    return this.chargingSessions.getOwnedOrThrow(user.id, vehicleId, id);
  }

  @Post(chargingSessionsByVehicleNestPath)
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Body(new ZodValidationPipe(ChargingSessionCreateSchema)) body: ChargingSessionCreate,
  ): Promise<ChargingSessionResponse> {
    return this.chargingSessions.create(user.id, vehicleId, body);
  }

  @Patch(chargingSessionByIdNestPath)
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(ChargingSessionUpdateSchema)) body: ChargingSessionUpdate,
  ): Promise<ChargingSessionResponse> {
    return this.chargingSessions.update(user.id, vehicleId, id, body);
  }

  @Delete(chargingSessionByIdNestPath)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.chargingSessions.remove(user.id, vehicleId, id);
  }
}
