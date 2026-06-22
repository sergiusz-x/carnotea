import type { FuelTypeCode } from '@carnotea/shared';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  generation?: string | null;
  productionYear: number;
  engine?: string | null;
  fuelType: FuelTypeCode;
  currentMileage: number;
}

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const { t } = useTranslation('vehicles');

  return (
    <Link
      to="/vehicles/$vehicleId"
      params={{ vehicleId: vehicle.id }}
      className="block"
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>
            {vehicle.brand} {vehicle.model}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">{t('fields.productionYear')}</dt>
            <dd>{vehicle.productionYear}</dd>
            {vehicle.engine && (
              <>
                <dt className="text-muted-foreground">{t('fields.engine')}</dt>
                <dd>{vehicle.engine}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{t('fields.fuelType')}</dt>
            <dd>{t(`fuelTypes.${vehicle.fuelType}`)}</dd>
            <dt className="text-muted-foreground">{t('fields.currentMileage')}</dt>
            <dd>{t('list.mileage', { mileage: vehicle.currentMileage })}</dd>
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
