import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';

import { VehicleCard } from './vehicle-card';

export function VehicleListPage() {
  const { t } = useTranslation('vehicles');
  const { data, isLoading, isError, error, refetch } = useQuery(vehiclesQueryOptions);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="space-y-4">
          <p>{t('error.load')}</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <Button onClick={() => void refetch()}>{t('error.retry')}</Button>
        </div>
      </div>
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <h2 className="text-xl font-semibold">{t('empty.title')}</h2>
          <p className="text-muted-foreground">{t('empty.description')}</p>
          <Link to="/vehicles/new">
            <Button>{t('empty.cta')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const vehicles = Array.isArray(data) ? data : [];

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <Link to="/vehicles/new">
          <Button>{t('addVehicle')}</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </div>
  );
}
