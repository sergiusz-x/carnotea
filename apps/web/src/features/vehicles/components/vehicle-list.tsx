import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';

import { VehicleCard } from './vehicle-card';

export function VehicleListPage() {
  const { t } = useTranslation('vehicles');
  const { data, isLoading, isError, error, refetch } = useQuery(vehiclesQueryOptions);

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError) {
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

  const vehicles = Array.isArray(data) ? data : [];

  if (vehicles.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Link to="/vehicles/new">
              <Button>{t('empty.cta')}</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('pageTitle')}
        action={
          <Link to="/vehicles/new">
            <Button>{t('addVehicle')}</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </PageContainer>
  );
}
