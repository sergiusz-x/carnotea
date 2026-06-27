import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Car, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { useActiveVehicle } from '@/features/vehicles/active-vehicle-context';
import { vehicleQueryOptions } from '@/features/vehicles/queries';

export function VehicleBanner() {
  const { t } = useTranslation('dashboard');
  const { activeVehicleId } = useActiveVehicle();
  const { data: vehicle } = useQuery({
    ...vehicleQueryOptions(activeVehicleId ?? ''),
    enabled: Boolean(activeVehicleId),
  });

  if (!activeVehicleId || !vehicle) return null;

  return (
    <Link
      to="/vehicles/$vehicleId"
      params={{ vehicleId: activeVehicleId }}
      className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Car className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">
            {vehicle.brand} {vehicle.model} {vehicle.productionYear}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('banner.mileage', { value: vehicle.currentMileage.toLocaleString() })}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary">{t('banner.active')}</Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
    </Link>
  );
}
