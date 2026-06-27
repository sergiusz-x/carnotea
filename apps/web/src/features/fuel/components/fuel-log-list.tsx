import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LogCard } from '@/components/LogCard';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { fuelLogsQueryOptions, useDeleteFuelLog } from '@/features/fuel/queries';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';

interface FuelLogRow {
  id: string;
  fuelDate: string;
  mileage: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  stationName: string | null;
  isFullTank: boolean;
}

function FuelLogCard({
  log,
  vehicleId,
  onDelete,
}: {
  log: FuelLogRow;
  vehicleId: string;
  onDelete: (id: string, fuelDate: string) => void;
}) {
  const { t, i18n } = useTranslation('fuel-logs');
  const { t: tc } = useTranslation('common');
  const currency = useCurrencyPref();
  const locale = i18n.resolvedLanguage ?? 'en';

  return (
    <LogCard
      date={log.fuelDate}
      badges={
        <Badge variant={log.isFullTank ? 'default' : 'secondary'} className="text-xs">
          {log.isFullTank ? t('list.fullTank') : t('list.partialFill')}
        </Badge>
      }
      stats={[
        { label: t('fields.liters'), value: String(log.liters) + ' L' },
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
      footer={
        <>
          <span>
            {log.mileage.toLocaleString(locale)}
            {' km'}
          </span>
          {log.stationName && (
            <>
              <span aria-hidden>{'·'}</span>
              <span className="truncate">{log.stationName}</span>
            </>
          )}
        </>
      }
      actions={
        <>
          <Link
            to="/vehicles/$vehicleId/fuel/$fuelId/edit"
            params={{ vehicleId, fuelId: log.id }}
            aria-label={tc('actions.edit')}
            className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'h-8 w-8' })}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label={tc('actions.delete')}
            onClick={() => {
              onDelete(log.id, log.fuelDate);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      }
    />
  );
}

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
      void deleteMutation.mutateAsync(id);
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

  const logs = (Array.isArray(fuelLogs) ? fuelLogs : []) as FuelLogRow[];

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

      {logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => (
            <FuelLogCard key={log.id} log={log} vehicleId={vehicleId} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
