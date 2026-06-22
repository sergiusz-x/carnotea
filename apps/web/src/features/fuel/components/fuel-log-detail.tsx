import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fuelLogQueryOptions,
  useDeleteFuelLog,
} from '@/features/fuel/queries';

export function FuelLogDetailPage() {
  const { vehicleId, fuelId }: { vehicleId: string; fuelId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fuel/$fuelId',
  });
  const { t } = useTranslation('fuel-logs');

  const {
    data: log,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(fuelLogQueryOptions(vehicleId, fuelId));

  const deleteMutation = useDeleteFuelLog(vehicleId);

  function handleDelete() {
    if (!log) return;
    if (window.confirm(t('delete.confirmMessage', { date: log.fuelDate }))) {
      void deleteMutation.mutateAsync(fuelId);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (isError || !log) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="space-y-4">
          <p>{t('error.load')}</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void refetch();
            }}
          >
            {t('error.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            to="/vehicles/$vehicleId/fuel"
            params={{ vehicleId }}
            className="text-sm text-muted-foreground hover:underline"
          >
            {t('detail.backToFuelLogs')}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {t('detail.title', { date: log.fuelDate })}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/vehicles/$vehicleId/fuel/$fuelId/edit"
            params={{ vehicleId, fuelId }}
          >
            <Button variant="outline">{t('edit.submit')}</Button>
          </Link>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {t('delete.confirm')}
          </Button>
        </div>
      </div>

      {/* Detail card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('detail.title', { date: log.fuelDate })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">{t('fields.fuelDate')}</dt>
            <dd>{log.fuelDate}</dd>

            <dt className="text-muted-foreground">{t('fields.mileage')}</dt>
            <dd>{t('list.mileage', { mileage: log.mileage })}</dd>

            <dt className="text-muted-foreground">{t('fields.liters')}</dt>
            <dd>{t('list.liters', { liters: log.liters })}</dd>

            <dt className="text-muted-foreground">
              {t('fields.pricePerLiter')}
            </dt>
            <dd>{t('list.price', { price: log.pricePerLiter })}</dd>

            <dt className="text-muted-foreground">{t('fields.totalCost')}</dt>
            <dd className="font-medium">
              {t('list.cost', { cost: log.totalCost })}
            </dd>

            <dt className="text-muted-foreground">
              {t('fields.stationName')}
            </dt>
            <dd>
              {log.stationName
                ? t('list.station', { station: log.stationName })
                : t('list.noStation')}
            </dd>

            <dt className="text-muted-foreground">
              {t('fields.isFullTank')}
            </dt>
            <dd>
              {log.isFullTank
                ? t('list.fullTank')
                : t('list.partialFill')}
            </dd>

            {log.consumptionHint !== null && (
              <>
                <dt className="text-muted-foreground">
                  {t('fields.consumptionHint')}
                </dt>
                <dd>
                  {t('detail.consumptionHint', {
                    hint: log.consumptionHint,
                  })}
                </dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}