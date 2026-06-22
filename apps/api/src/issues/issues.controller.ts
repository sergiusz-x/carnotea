import {
  ErrorResponseSchema,
  IssueCreateSchema,
  IssueUpdateSchema,
  ROUTES,
  type IssueCreate,
  type IssueUpdate,
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
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { AuthGuard } from '../auth/auth.guard.js';
import { type AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { zodRoute, ZodValidationPipe } from '../lib/openapi/index.js';

import { IssuesService, type IssueResponse } from './issues.service.js';

const vehicleIdParam = z.object({ vehicleId: z.uuid() });
const issueIdParam = z.object({ vehicleId: z.uuid(), id: z.uuid() });
const issuesQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const vehicleIdPipe = new ZodValidationPipe(z.uuid());
const idPipe = new ZodValidationPipe(z.uuid());
const issuesByVehicleNestPath = ROUTES.issuesByVehicle
  .replace('{vehicleId}', ':vehicleId')
  .slice(1);
const issueByIdNestPath = ROUTES.issueById
  .replace('{vehicleId}', ':vehicleId')
  .replace('{id}', ':id')
  .slice(1);

const IssueResponseSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  reportedDate: z.iso.date(),
  resolvedDate: z.iso.date().nullable(),
  title: z.string().max(160),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  relatedServiceRecordId: z.uuid().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

zodRoute({
  method: 'get',
  path: ROUTES.issuesByVehicle,
  operationId: 'listIssues',
  summary: "List an owned vehicle's issues, newest first",
  tags: ['Issues'],
  request: { params: vehicleIdParam, query: issuesQuerySchema },
  responses: {
    '200': { description: 'Issues for the vehicle', schema: z.array(IssueResponseSchema) },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.issueById,
  operationId: 'getIssue',
  summary: 'Get one issue',
  tags: ['Issues'],
  request: { params: issueIdParam },
  responses: {
    '200': { description: 'The issue', schema: IssueResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Issue not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'post',
  path: ROUTES.issuesByVehicle,
  operationId: 'createIssue',
  summary: 'Create an issue',
  tags: ['Issues'],
  request: { params: vehicleIdParam, body: IssueCreateSchema },
  responses: {
    '201': { description: 'The created issue', schema: IssueResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'patch',
  path: ROUTES.issueById,
  operationId: 'updateIssue',
  summary: 'Update an issue',
  tags: ['Issues'],
  request: { params: issueIdParam, body: IssueUpdateSchema },
  responses: {
    '200': { description: 'The updated issue', schema: IssueResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Issue not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'delete',
  path: ROUTES.issueById,
  operationId: 'deleteIssue',
  summary: 'Delete an issue',
  tags: ['Issues'],
  request: { params: issueIdParam },
  responses: {
    '204': { description: 'Deleted' },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Issue not found', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Get(issuesByVehicleNestPath)
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Query(new ZodValidationPipe(issuesQuerySchema)) query: z.infer<typeof issuesQuerySchema>,
  ): Promise<IssueResponse[]> {
    return this.issues.list(user.id, vehicleId, query);
  }

  @Get(issueByIdNestPath)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<IssueResponse> {
    return this.issues.getOwnedOrThrow(user.id, vehicleId, id);
  }

  @Post(issuesByVehicleNestPath)
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Body(new ZodValidationPipe(IssueCreateSchema)) body: IssueCreate,
  ): Promise<IssueResponse> {
    return this.issues.create(user.id, vehicleId, body);
  }

  @Patch(issueByIdNestPath)
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(IssueUpdateSchema)) body: IssueUpdate,
  ): Promise<IssueResponse> {
    return this.issues.update(user.id, vehicleId, id, body);
  }

  @Delete(issueByIdNestPath)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.issues.remove(user.id, vehicleId, id);
  }
}
