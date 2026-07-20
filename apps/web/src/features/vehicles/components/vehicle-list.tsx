import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';

import { VehicleCard } from './vehicle-card';

export function VehicleListPage() {
  const { t } = useTranslation('vehicles');
  const { data, isLoading, isError, error, refetch } = useQuery(vehiclesQueryOptions);

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title={t('pageTitle')} action={<Button disabled>{t('addVehicle')}</Button>} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm h-[200px]"
            >
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-4 w-2/3 mt-2" />
              <div className="mt-auto flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
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
