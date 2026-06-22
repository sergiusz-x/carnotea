import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const dashboardKeys = {
  overview: () => ['dashboard', 'overview'] as const,
  expensesByCategory: () => ['dashboard', 'expenses-by-category'] as const,
  monthlySpend: () => ['dashboard', 'monthly-spend'] as const,
  upcomingReminders: () => ['dashboard', 'upcoming-reminders'] as const,
};

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchDashboardOverview() {
  const { data } = await apiClient.GET('/api/dashboard/overview');
  return data;
}

async function fetchExpensesByCategory() {
  const { data } = await apiClient.GET('/api/dashboard/expenses-by-category');
  return data;
}

async function fetchMonthlySpend() {
  const { data } = await apiClient.GET('/api/dashboard/monthly-spend');
  return data;
}

async function fetchUpcomingReminders() {
  const { data } = await apiClient.GET('/api/dashboard/upcoming-reminders');
  return data;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const dashboardOverviewQueryOptions = queryOptions({
  queryKey: dashboardKeys.overview(),
  queryFn: fetchDashboardOverview,
});

export const expensesByCategoryQueryOptions = queryOptions({
  queryKey: dashboardKeys.expensesByCategory(),
  queryFn: fetchExpensesByCategory,
});

export const monthlySpendQueryOptions = queryOptions({
  queryKey: dashboardKeys.monthlySpend(),
  queryFn: fetchMonthlySpend,
});

export const upcomingRemindersQueryOptions = queryOptions({
  queryKey: dashboardKeys.upcomingReminders(),
  queryFn: fetchUpcomingReminders,
});