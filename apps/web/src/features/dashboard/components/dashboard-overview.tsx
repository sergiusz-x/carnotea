import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chargingSessionsQueryOptions } from '@/features/charging/queries';
import { useActiveVehicle } from '@/features/vehicles/active-vehicle-context';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';
import { calculateChargingMetrics, isElectricVehicle } from '@/features/vehicles/vehicle-usage';

import { dashboardOverviewQueryOptions } from '../queries';

export function DashboardOverview() {
  const { t } = useTranslation('dashboard');
  const { activeVehicleId } = useActiveVehicle();
  const { data, isLoading, isError, refetch } = useQuery(dashboardOverviewQueryOptions);
  const { data: vehicles } = useQuery(vehiclesQueryOptions);

  const activeVehicle = vehicles?.find((vehicle) => vehicle.id === activeVehicleId);
  const showElectricMetrics = isElectricVehicle(activeVehicle?.fuelType);
  const { data: chargingSessions, isLoading: chargingLoading } = useQuery({
    ...chargingSessionsQueryOptions(activeVehicleId ?? ''),
    enabled: Boolean(activeVehicleId) && showElectricMetrics,
  });

  if (isLoading || (showElectricMetrics && chargingLoading)) {
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
  const chargingMetrics = calculateChargingMetrics(chargingSessions);
  const totalVariableCost = showElectricMetrics
    ? chargingMetrics.totalChargingCost
    : data?.totalFuelCost;
  const averageConsumption = showElectricMetrics
    ? chargingMetrics.avgEnergyConsumption
    : data?.avgFuelConsumption;

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
      title: showElectricMetrics ? t('overview.totalChargingCost') : t('overview.totalFuelCost'),
      value:
        totalVariableCost != null
          ? t('overview.unit', { currency, value: totalVariableCost.toFixed(2) })
          : t('overview.noData'),
    },
    {
      title: showElectricMetrics
        ? t('overview.avgEnergyConsumption')
        : t('overview.avgFuelConsumption'),
      value:
        averageConsumption != null
          ? t(showElectricMetrics ? 'overview.energyConsumptionUnit' : 'overview.consumptionUnit', {
              value: averageConsumption.toFixed(1),
            })
          : t('overview.noData'),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="label-micro font-sans">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display tnum text-2xl font-semibold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
