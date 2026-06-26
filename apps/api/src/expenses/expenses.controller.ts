import {
  ErrorResponseSchema,
  ExpenseCreateSchema,
  ExpenseListQuery,
  ExpenseUpdateSchema,
  ROUTES,
  type ExpenseCreate,
  type ExpenseListQueryType,
  type ExpenseUpdate,
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

import { ExpensesService, type ExpenseResponse } from './expenses.service.js';

const expensesByVehicleNestPath = nestListPath(ROUTES.expensesByVehicle);
const expenseByIdNestPath = nestDetailPath(ROUTES.expenseById);
const expenseIdParam = resourceWithVehicleParam;

const ExpenseResponseSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid(),
  category: z.string(),
  expenseDate: z.iso.date(),
  amount: z.number().nonnegative(),
  description: z.string().nullable(),
  sourceType: z.string(),
  sourceId: z.uuid().nullable(),
  isAutoSynced: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});

zodRoute({
  method: 'get',
  path: ROUTES.expensesByVehicle,
  operationId: 'listExpenses',
  summary: "List an owned vehicle's expenses, newest first",
  tags: ['Expenses'],
  request: { params: vehicleIdParam, query: ExpenseListQuery },
  responses: {
    '200': { description: 'Expenses for the vehicle', schema: z.array(ExpenseResponseSchema) },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.expenseById,
  operationId: 'getExpense',
  summary: 'Get one expense',
  tags: ['Expenses'],
  request: { params: expenseIdParam },
  responses: {
    '200': { description: 'The expense', schema: ExpenseResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Expense not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'post',
  path: ROUTES.expensesByVehicle,
  operationId: 'createExpense',
  summary: 'Create a manual expense',
  tags: ['Expenses'],
  request: { params: vehicleIdParam, body: ExpenseCreateSchema },
  responses: {
    '201': { description: 'The created expense', schema: ExpenseResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Vehicle not found', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'patch',
  path: ROUTES.expenseById,
  operationId: 'updateExpense',
  summary: 'Update a manual expense',
  tags: ['Expenses'],
  request: { params: expenseIdParam, body: ExpenseUpdateSchema },
  responses: {
    '200': { description: 'The updated expense', schema: ExpenseResponseSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Expense not found', schema: ErrorResponseSchema },
    '409': { description: 'Cannot edit auto-synced expense', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'delete',
  path: ROUTES.expenseById,
  operationId: 'deleteExpense',
  summary: 'Delete a manual expense',
  tags: ['Expenses'],
  request: { params: expenseIdParam },
  responses: {
    '204': { description: 'Deleted' },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
    '404': { description: 'Expense not found', schema: ErrorResponseSchema },
    '409': { description: 'Cannot delete auto-synced expense', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get(expensesByVehicleNestPath)
  list(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Query(new ZodValidationPipe(ExpenseListQuery)) query: ExpenseListQueryType,
  ): Promise<ExpenseResponse[]> {
    return this.expenses.list(user.id, vehicleId, query.source);
  }

  @Get(expenseByIdNestPath)
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<ExpenseResponse> {
    return this.expenses.getOwnedOrThrow(user.id, vehicleId, id);
  }

  @Post(expensesByVehicleNestPath)
  create(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Body(new ZodValidationPipe(ExpenseCreateSchema)) body: ExpenseCreate,
  ): Promise<ExpenseResponse> {
    return this.expenses.create(user.id, vehicleId, body);
  }

  @Patch(expenseByIdNestPath)
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(ExpenseUpdateSchema)) body: ExpenseUpdate,
  ): Promise<ExpenseResponse> {
    return this.expenses.update(user.id, vehicleId, id, body);
  }

  @Delete(expenseByIdNestPath)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', vehicleIdPipe) vehicleId: string,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.expenses.remove(user.id, vehicleId, id);
  }
}
