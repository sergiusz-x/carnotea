import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { dashboardOverviewQueryOptions } from '../queries';

export function DashboardOverview() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, isError, refetch } = useQuery(dashboardOverviewQueryOptions);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={t('error.load')}
        onRetry={() => void refetch()}
        retryLabel={t('error.retry')}
      />
    );
  }

  const currency = data?.currency ?? '';

  const cards = [
    {
      title: t('overview.totalVehicles'),
      value: data?.totalVehicles != null ? String(data.totalVehicles) : t('overview.noData'),
    },
    {
      title: t('overview.totalExpenses'),
      value:
        data?.totalExpenses != null
          ? t('overview.unit', { currency, value: data.totalExpenses.toFixed(2) })
          : t('overview.noData'),
    },
    {
      title: t('overview.totalFuelCost'),
      value:
        data?.totalFuelCost != null
          ? t('overview.unit', { currency, value: data.totalFuelCost.toFixed(2) })
          : t('overview.noData'),
    },
    {
      title: t('overview.avgFuelConsumption'),
      value:
        data?.avgFuelConsumption != null
          ? t('overview.consumptionUnit', { value: data.avgFuelConsumption.toFixed(1) })
          : t('overview.noData'),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
