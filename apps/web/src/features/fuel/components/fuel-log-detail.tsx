import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fuelLogQueryOptions, useDeleteFuelLog } from '@/features/fuel/queries';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';

export function FuelLogDetailPage() {
  const { vehicleId, fuelId }: { vehicleId: string; fuelId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fuel/$fuelId',
  });
  const { t, i18n } = useTranslation('fuel-logs');
  const { t: tc } = useTranslation('common');
  const currency = useCurrencyPref();
  const locale = i18n.resolvedLanguage ?? 'en';

  const { data: log, isLoading, isError, error, refetch } = useQuery(
    fuelLogQueryOptions(vehicleId, fuelId),
  );
  const deleteMutation = useDeleteFuelLog(vehicleId);

  function handleDelete() {
    if (!log) return;
    if (window.confirm(t('delete.confirmMessage', { date: log.fuelDate }))) {
      void deleteMutation.mutateAsync(fuelId);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !log) {
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

  return (
    <PageContainer>
      {/* Back + actions */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/vehicles/$vehicleId/fuel"
          params={{ vehicleId }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('detail.backToFuelLogs')}
        </Link>
        <div className="flex gap-2">
          <Link
            to="/vehicles/$vehicleId/fuel/$fuelId/edit"
            params={{ vehicleId, fuelId }}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {tc('actions.edit')}
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {tc('actions.delete')}
          </Button>
        </div>
      </div>

      {/* Title + badge */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">{t('detail.title', { date: log.fuelDate })}</h1>
        <Badge variant={log.isFullTank ? 'default' : 'secondary'}>
          {log.isFullTank ? t('list.fullTank') : t('list.partialFill')}
        </Badge>
      </div>

      {/* Cost highlight */}
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-3 gap-px bg-border">
            <div className="bg-background px-4 py-4 text-center">
              <p className="text-xs text-muted-foreground">{t('fields.liters')}</p>
              <p className="text-xl font-bold">{log.liters}{' L'}</p>
            </div>
            <div className="bg-background px-4 py-4 text-center">
              <p className="text-xs text-muted-foreground">{t('fields.pricePerLiter')}</p>
              <p className="text-xl font-bold">{formatMoney(log.pricePerLiter, currency, locale)}</p>
            </div>
            <div className="bg-background px-4 py-4 text-center">
              <p className="text-xs text-muted-foreground">{t('fields.totalCost')}</p>
              <p className="text-xl font-bold text-primary">{formatMoney(log.totalCost, currency, locale)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="pt-4">
          <dl className="divide-y">
            <div className="flex justify-between py-2.5 text-sm">
              <dt className="text-muted-foreground">{t('fields.mileage')}</dt>
              <dd className="font-medium">{log.mileage.toLocaleString(locale)}{' km'}</dd>
            </div>
            {log.stationName && (
              <div className="flex justify-between py-2.5 text-sm">
                <dt className="text-muted-foreground">{t('fields.stationName')}</dt>
                <dd className="font-medium">{log.stationName}</dd>
              </div>
            )}
            {log.consumptionHint != null && (
              <div className="flex justify-between py-2.5 text-sm">
                <dt className="text-muted-foreground">{t('fields.consumptionHint')}</dt>
                <dd className="font-medium">
                  {t('detail.consumptionHint', { hint: log.consumptionHint })}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
