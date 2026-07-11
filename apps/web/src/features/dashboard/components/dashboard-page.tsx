import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ActivityFeed } from '@/features/activity/components/activity-feed';
import { VehiclePanelCard } from '@/features/activity/components/vehicle-panel';
import { vehiclePanelQueryOptions } from '@/features/activity/queries';
import { ExpenseByCategoryChart } from '@/features/dashboard/components/expense-by-category-chart';
import { MonthlySpend } from '@/features/dashboard/components/monthly-spend';
import { UpcomingReminders } from '@/features/dashboard/components/upcoming-reminders';
import { useActiveVehicle } from '@/features/vehicles/active-vehicle-context';

export function DashboardPage() {
  const { t, i18n } = useTranslation(['dashboard', 'activity']);
  const { activeVehicleId } = useActiveVehicle();
  const locale = i18n.resolvedLanguage ?? 'en';
  const panelQuery = useQuery({
    ...vehiclePanelQueryOptions(activeVehicleId ?? ''),
    enabled: Boolean(activeVehicleId),
  });

  if (!activeVehicleId) {
    return (
      <div className="mx-auto w-full max-w-screen-xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <EmptyState title={t('empty.title')} description={t('empty.description')} />
      </div>
    );
  }

  if (panelQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-screen-xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (panelQuery.isError || !panelQuery.data) {
    return (
      <div className="mx-auto w-full max-w-screen-xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <ErrorState
          message={t('activity:feed.error')}
          onRetry={() => void panelQuery.refetch()}
          retryLabel={t('activity:feed.retry')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <VehiclePanelCard panel={panelQuery.data} locale={locale} />
      <ActivityFeed
        vehicleId={activeVehicleId}
        currency={panelQuery.data.currency}
        locale={locale}
        fuelType={panelQuery.data.fuelType}
      />

      <section className="space-y-4 border-t pt-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-muted-foreground">
          {t('sections.analytics')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <ExpenseByCategoryChart />
          <MonthlySpend />
        </div>
        <UpcomingReminders />
      </section>
    </div>
  );
}
