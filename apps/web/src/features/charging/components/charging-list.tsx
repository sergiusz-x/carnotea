import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChargingCard } from '@/features/charging/components/charging-card';
import { chargingSessionsQueryOptions, useDeleteChargingSession } from '@/features/charging/queries';

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
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (isError || !sessions) {
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

  const list = Array.isArray(sessions) ? sessions : [];

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <Link to="/vehicles/$vehicleId/charging/new" params={{ vehicleId }}>
          <Button>{t('addChargingSession')}</Button>
        </Link>
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('empty.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t('empty.description')}</p>
            <Link to="/vehicles/$vehicleId/charging/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          </CardContent>
        </Card>
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
    </div>
  );
}