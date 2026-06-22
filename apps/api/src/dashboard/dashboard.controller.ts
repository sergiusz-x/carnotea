import {
  DashboardOverviewSchema,
  type DashboardOverview,
  ErrorResponseSchema,
  ExpensesByCategoryResponseSchema,
  type ExpensesByCategoryResponse,
  MonthlySpendResponseSchema,
  type MonthlySpendResponse,
  ROUTES,
  UpcomingRemindersResponseSchema,
  type UpcomingReminder,
} from '@carnotea/shared';
import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard.js';
import { type AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { zodRoute } from '../lib/openapi/index.js';

import { DashboardService } from './dashboard.service.js';

zodRoute({
  method: 'get',
  path: ROUTES.dashboardOverview,
  operationId: 'getDashboardOverview',
  summary: "Account-wide dashboard overview — vehicle count, expenses, fuel stats",
  tags: ['Dashboard'],
  request: {},
  responses: {
    '200': { description: 'Dashboard overview', schema: DashboardOverviewSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.dashboardExpensesByCategory,
  operationId: 'getExpensesByCategory',
  summary: 'Expenses grouped by category for the last 12 months',
  tags: ['Dashboard'],
  request: {},
  responses: {
    '200': { description: 'Expenses by category', schema: ExpensesByCategoryResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.dashboardMonthlySpend,
  operationId: 'getMonthlySpend',
  summary: 'Monthly spend for the last 12 months',
  tags: ['Dashboard'],
  request: {},
  responses: {
    '200': { description: 'Monthly spend series', schema: MonthlySpendResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'get',
  path: ROUTES.dashboardUpcomingReminders,
  operationId: 'getUpcomingReminders',
  summary: 'Upcoming reminders due within 30 days across all vehicles',
  tags: ['Dashboard'],
  request: {},
  responses: {
    '200': { description: 'Upcoming reminders', schema: UpcomingRemindersResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get(ROUTES.dashboardOverview.slice(1))
  getOverview(@CurrentUser() user: AuthUser): Promise<DashboardOverview> {
    return this.dashboard.getOverview(user.id);
  }

  @Get(ROUTES.dashboardExpensesByCategory.slice(1))
  getExpensesByCategory(@CurrentUser() user: AuthUser): Promise<ExpensesByCategoryResponse> {
    return this.dashboard.getExpensesByCategory(user.id);
  }

  @Get(ROUTES.dashboardMonthlySpend.slice(1))
  getMonthlySpend(@CurrentUser() user: AuthUser): Promise<MonthlySpendResponse> {
    return this.dashboard.getMonthlySpend(user.id);
  }

  @Get(ROUTES.dashboardUpcomingReminders.slice(1))
  getUpcomingReminders(@CurrentUser() user: AuthUser): Promise<UpcomingReminder[]> {
    return this.dashboard.getUpcomingReminders(user.id);
  }
}