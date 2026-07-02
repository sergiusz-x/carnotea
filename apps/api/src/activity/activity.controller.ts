import {
  ActivityFeedResponseSchema,
  ActivityQuerySchema,
  ErrorResponseSchema,
  ROUTES,
  VehiclePanelSchema,
  type ActivityFeedResponse,
  type ActivityQuery,
  type VehiclePanel,
} from '@carnotea/shared';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard.js';
import { type AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { zodRoute, ZodValidationPipe } from '../lib/openapi/index.js';
import { nestListPath, vehicleIdParam, vehicleIdPipe } from '../lib/route-params.js';

import { ActivityService } from './activity.service.js';

const vehicleActivityNestPath = nestListPath(ROUTES.vehicleActivity);
const vehiclePanelNestPath = nestListPath(ROUTES.vehiclePanel);

zodRoute({
  method: 'get',
  path: ROUTES.vehicleActivity,
  operationId: 'getVehicleActivity',
  summary: 'The unified activity feed (Dziennik) for an owned vehicle, newest first',
  tags: ['Activity'],
  request: { params: vehicleIdParam, query: ActivityQuerySchema },
  responses: {
    '200': { description: 'A page of the activity feed', schema: ActivityFeedResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.vehiclePanel,
  operationId: 'getVehiclePanel',
  summary: 'The minimal vitals panel for an owned vehicle',
  tags: ['Activity'],
  request: { params: vehicleIdParam },
  responses: {
    '200': { description: 'The vehicle panel', schema: VehiclePanelSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get(vehicleActivityNestPath)
  getActivity(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Query(new ZodValidationPipe(ActivityQuerySchema)) query: ActivityQuery,
  ): Promise<ActivityFeedResponse> {
    return this.activity.getActivity(user.id, vehicleId, query);
  }

  @Get(vehiclePanelNestPath)
  getPanel(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
  ): Promise<VehiclePanel> {
    return this.activity.getPanel(user.id, vehicleId);
  }
}
