import {
  ErrorResponseSchema,
  ReminderCreateSchema,
  ReminderSchema,
  ReminderUpdateSchema,
  REMINDER_STATUS_CODES,
  ROUTES,
  type Reminder,
  type ReminderCreate,
  type ReminderUpdate,
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
import {
  idPipe,
  nestDetailPath,
  nestListPath,
  resourceWithVehicleParam,
  vehicleIdParam,
  vehicleIdPipe,
} from '../lib/route-params.js';

import { RemindersService } from './reminders.service.js';

const reminderIdParam = resourceWithVehicleParam;
const remindersByVehicleNestPath = nestListPath(ROUTES.remindersByVehicle);
const reminderByIdNestPath = nestDetailPath(ROUTES.reminderById);

const ReminderQuerySchema = z.object({
  status: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : undefined))
    .pipe(z.array(z.enum(REMINDER_STATUS_CODES)).optional()),
  dueState: z.enum(['overdue', 'due_soon', 'ok']).optional(),
});
const queryPipe = new ZodValidationPipe(ReminderQuerySchema);
type ReminderQuery = z.infer<typeof ReminderQuerySchema>;

zodRoute({
  method: 'get',
  path: ROUTES.remindersByVehicle,
  operationId: 'listReminders',
  summary: "List an owned vehicle's reminders",
  tags: ['Reminders'],
  request: { params: vehicleIdParam, query: ReminderQuerySchema },
  responses: {
    '200': { description: 'Reminders for the vehicle', schema: z.array(ReminderSchema) },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.reminderById,
  operationId: 'getReminder',
  summary: 'Get one reminder',
  tags: ['Reminders'],
  request: { params: reminderIdParam },
  responses: {
    '200': { description: 'The reminder', schema: ReminderSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Reminder not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'post',
  path: ROUTES.remindersByVehicle,
  operationId: 'createReminder',
  summary: 'Create a reminder',
  tags: ['Reminders'],
  request: { params: vehicleIdParam, body: ReminderCreateSchema },
  responses: {
    '201': { description: 'The created reminder', schema: ReminderSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'patch',
  path: ROUTES.reminderById,
  operationId: 'updateReminder',
  summary: 'Update a reminder',
  tags: ['Reminders'],
  request: { params: reminderIdParam, body: ReminderUpdateSchema },
  responses: {
    '200': { description: 'The updated reminder', schema: ReminderSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Reminder not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'delete',
  path: ROUTES.reminderById,
  operationId: 'deleteReminder',
  summary: 'Delete a reminder',
  tags: ['Reminders'],
  request: { params: reminderIdParam },
  responses: {
    '204': { description: 'Deleted' },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Reminder not found', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get(remindersByVehicleNestPath)
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Query(queryPipe) query?: ReminderQuery,
  ): Promise<Reminder[]> {
    const filters =
      query?.status || query?.dueState
        ? { status: query.status, dueState: query.dueState }
        : undefined;
    return this.reminders.list(user.id, vehicleId, filters);
  }

  @Get(reminderByIdNestPath)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<Reminder> {
    return this.reminders.getOwnedOrThrow(user.id, vehicleId, id);
  }

  @Post(remindersByVehicleNestPath)
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Body(new ZodValidationPipe(ReminderCreateSchema)) body: ReminderCreate,
  ): Promise<Reminder> {
    return this.reminders.create(user.id, vehicleId, body);
  }

  @Patch(reminderByIdNestPath)
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(ReminderUpdateSchema)) body: ReminderUpdate,
  ): Promise<Reminder> {
    return this.reminders.update(user.id, vehicleId, id, body);
  }

  @Delete(reminderByIdNestPath)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.reminders.remove(user.id, vehicleId, id);
  }
}
