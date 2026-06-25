import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fuelLogsQueryOptions, useDeleteFuelLog } from '@/features/fuel/queries';

export function FuelLogListPage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fuel',
  });
  const { t } = useTranslation('fuel-logs');

  const {
    data: fuelLogs,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(fuelLogsQueryOptions(vehicleId));

  const deleteMutation = useDeleteFuelLog(vehicleId);

  function handleDelete(id: string, fuelDate: string) {
    if (window.confirm(t('delete.confirmMessage', { date: fuelDate }))) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      deleteMutation.mutateAsync(id);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !fuelLogs) {
    return (
      <PageContainer>
        <ErrorState
          message={t('error.load')}
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => void refetch()}
          retryLabel={t('error.retry')}
        />
      </PageContainer>
    );
  }

  const logs = Array.isArray(fuelLogs) ? fuelLogs : [];

  return (
    <PageContainer>
      <PageHeader
        title={t('pageTitle')}
        action={
          <Link to="/vehicles/$vehicleId/fuel/new" params={{ vehicleId }}>
            <Button>{t('addFuelLog')}</Button>
          </Link>
        }
      />

      {logs.length === 0 && (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Link to="/vehicles/$vehicleId/fuel/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          }
        />
      )}

      {/* Fuel log cards */}
      {logs.length > 0 && (
        <div className="space-y-4">
          {logs.map(
            (log: {
              id: string;
              fuelDate: string;
              mileage: number;
              liters: number;
              pricePerLiter: number;
              totalCost: number;
              stationName: string | null;
              isFullTank: boolean;
            }) => (
              <Card key={log.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.fuelDate}</span>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {log.isFullTank ? t('list.fullTank') : t('list.partialFill')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <span className="text-muted-foreground">{t('fields.mileage')}</span>
                        <span>{t('list.mileage', { mileage: log.mileage })}</span>
                        <span className="text-muted-foreground">{t('fields.liters')}</span>
                        <span>{t('list.liters', { liters: log.liters })}</span>
                        <span className="text-muted-foreground">{t('fields.pricePerLiter')}</span>
                        <span>{t('list.price', { price: log.pricePerLiter })}</span>
                        <span className="text-muted-foreground">{t('fields.totalCost')}</span>
                        <span className="font-medium">
                          {t('list.cost', { cost: log.totalCost })}
                        </span>
                        <span className="text-muted-foreground">{t('fields.stationName')}</span>
                        <span>
                          {log.stationName
                            ? t('list.station', { station: log.stationName })
                            : t('list.noStation')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to="/vehicles/$vehicleId/fuel/$fuelId/edit"
                        params={{ vehicleId, fuelId: log.id }}
                      >
                        <Button variant="outline" size="sm">
                          {t('edit.submit')}
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          handleDelete(log.id, log.fuelDate);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        {t('delete.confirm')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </PageContainer>
  );
}
