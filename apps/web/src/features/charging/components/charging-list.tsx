import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ChargingCard } from '@/features/charging/components/charging-card';
import {
  chargingSessionsQueryOptions,
  useDeleteChargingSession,
} from '@/features/charging/queries';

export function ChargingListPage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/charging',
  });
  const { t } = useTranslation('charging');

  const {
    data: sessions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(chargingSessionsQueryOptions(vehicleId));

  const deleteMutation = useDeleteChargingSession(vehicleId);

  function handleDelete(id: string, chargeDate: string) {
    if (window.confirm(t('delete.confirmMessage', { date: chargeDate }))) {
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

  if (isError || !sessions) {
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

  const list = Array.isArray(sessions) ? sessions : [];

  return (
    <PageContainer>
      <PageHeader
        title={t('pageTitle')}
        action={
          <Link to="/vehicles/$vehicleId/charging/new" params={{ vehicleId }}>
            <Button>{t('addChargingSession')}</Button>
          </Link>
        }
      />

      {list.length === 0 && (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Link to="/vehicles/$vehicleId/charging/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          }
        />
      )}

      {/* Charging cards */}
      {list.length > 0 && (
        <div className="space-y-4">
          {list.map(
            (session: {
              id: string;
              chargeDate: string;
              mileage: number;
              energyKwh: number;
              pricePerKwh: number;
              totalCost: number;
              chargerType: string;
              socStartPercent: number | null;
              socEndPercent: number | null;
              stationName: string | null;
              isFullCharge: boolean;
            }) => (
              <ChargingCard
                key={session.id}
                id={session.id}
                chargeDate={session.chargeDate}
                mileage={session.mileage}
                energyKwh={session.energyKwh}
                pricePerKwh={session.pricePerKwh}
                totalCost={session.totalCost}
                chargerType={session.chargerType}
                socStartPercent={session.socStartPercent}
                socEndPercent={session.socEndPercent}
                stationName={session.stationName}
                isFullCharge={session.isFullCharge}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ),
          )}
        </div>
      )}
    </PageContainer>
  );
}
