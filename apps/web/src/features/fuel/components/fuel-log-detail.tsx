import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { StatStrip } from '@/components/StatStrip';
import { Badge } from '@/components/ui/badge';
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
      <Link
        to="/vehicles/$vehicleId/fuel"
        params={{ vehicleId }}
        className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('detail.backToFuelLogs')}
      </Link>

      <PageHeader
        title={t('detail.title', { date: log.fuelDate })}
        action={
          <div className="flex items-center gap-1">
            <Link
              to="/vehicles/$vehicleId/fuel/$fuelId/edit"
              params={{ vehicleId, fuelId }}
              aria-label={tc('actions.edit')}
              title={tc('actions.edit')}
              className={editActionClassName}
            >
              <EditActionIcon />
            </Link>
            <DeleteAction onClick={handleDelete} disabled={deleteMutation.isPending} />
          </div>
        }
      />

      <div className="mb-4">
        <Badge variant={log.isFullTank ? 'default' : 'secondary'}>
          {log.isFullTank ? t('list.fullTank') : t('list.partialFill')}
        </Badge>
      </div>

      {/* Cost highlight */}
      <Card className="mb-4">
        <CardContent className="p-0">
          <StatStrip
            stats={[
              { label: t('fields.liters'), value: `${log.liters.toString()} L` },
              {
                label: t('fields.pricePerLiter'),
                value: formatMoney(log.pricePerLiter, currency, locale),
              },
              {
                label: t('fields.totalCost'),
                value: formatMoney(log.totalCost, currency, locale),
                highlight: true,
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="pt-4">
          <dl className="divide-y">
            <div className="flex justify-between py-2.5 text-sm">
              <dt className="text-muted-foreground">{t('fields.mileage')}</dt>
              <dd className="font-medium">
                {log.mileage.toLocaleString(locale)}
                {' km'}
              </dd>
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
