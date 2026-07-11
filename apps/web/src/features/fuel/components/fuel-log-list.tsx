import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListCard } from '@/components/ListCard';
import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { StatStrip } from '@/components/StatStrip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  description: string | null;
  isFullTank: boolean;
  consumptionHint: number | null;
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
    <ListCard
      primary={
        <Link
          to="/vehicles/$vehicleId/fuel/$fuelId"
          params={{ vehicleId, fuelId: log.id }}
          className="font-display text-base font-semibold tnum hover:underline"
        >
          {log.fuelDate}
        </Link>
      }
      badges={
        <>
          <Badge variant={log.isFullTank ? 'default' : 'secondary'} className="text-xs">
            {log.isFullTank ? t('list.fullTank') : t('list.partialFill')}
          </Badge>
          {log.consumptionHint != null ? (
            <Badge variant="outline" className="text-xs">
              {t('list.consumptionHint', {
                hint: new Intl.NumberFormat(locale, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                }).format(log.consumptionHint),
              })}
            </Badge>
          ) : null}
        </>
      }
      actions={
        <>
          <Link
            to="/vehicles/$vehicleId/fuel/$fuelId/edit"
            params={{ vehicleId, fuelId: log.id }}
            aria-label={tc('actions.edit')}
            title={tc('actions.edit')}
            className={editActionClassName}
          >
            <EditActionIcon />
          </Link>
          <DeleteAction
            onClick={() => {
              onDelete(log.id, log.fuelDate);
            }}
          />
        </>
      }
    >
      <StatStrip
        stats={[
          { label: t('fields.liters'), value: `${String(log.liters)} L` },
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

      {log.description ? (
        <div className="border-t px-4 py-2.5 text-sm text-muted-foreground whitespace-pre-wrap">
          {log.description}
        </div>
      ) : null}

      <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground tnum">
        <span>
          {log.mileage.toLocaleString(locale)}
          {' km'}
        </span>
        {log.stationName ? (
          <>
            <span aria-hidden>{'·'}</span>
            <span className="truncate">{log.stationName}</span>
          </>
        ) : null}
      </div>
    </ListCard>
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
