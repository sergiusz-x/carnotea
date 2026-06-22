import { createRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview';
import { ExpenseByCategoryChart } from '@/features/dashboard/components/expense-by-category-chart';
import { MonthlySpend } from '@/features/dashboard/components/monthly-spend';
import { UpcomingReminders } from '@/features/dashboard/components/upcoming-reminders';

import { authenticatedLayoutRoute } from '../_authenticated';

export const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation('dashboard');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('pageTitle')}</h1>
      <DashboardOverview />
      <div className="grid gap-6 md:grid-cols-2">
        <ExpenseByCategoryChart />
        <MonthlySpend />
      </div>
      <UpcomingReminders />
    </div>
  );
}