import type { ChargerTypeCode } from '@carnotea/shared';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ChargingCardProps {
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
  onDelete: (id: string, chargeDate: string) => void;
  isDeleting: boolean;
}

const chargerTypeBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  home_socket: 'secondary',
  ac_type2: 'default',
  dc_ccs: 'outline',
  dc_chademo: 'outline',
  tesla_sc: 'default',
  other: 'secondary',
};

export function ChargingCard({
  id,
  chargeDate,
  mileage,
  energyKwh,
  pricePerKwh,
  totalCost,
  chargerType,
  socStartPercent,
  socEndPercent,
  stationName,
  isFullCharge,
  onDelete,
  isDeleting,
}: ChargingCardProps) {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/charging',
  });
  const { t } = useTranslation('charging');

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{chargeDate}</span>
              <Badge variant={chargerTypeBadgeVariant[chargerType] ?? 'default'}>
                {t(`chargerType.${chargerType as ChargerTypeCode}`)}
              </Badge>
              {isFullCharge && (
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {t('list.fullCharge')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">{t('fields.mileage')}</span>
              <span>{t('list.mileage', { mileage })}</span>
              <span className="text-muted-foreground">{t('fields.energyKwh')}</span>
              <span>{t('list.energy', { energy: energyKwh })}</span>
              <span className="text-muted-foreground">{t('fields.pricePerKwh')}</span>
              <span>{t('list.price', { price: pricePerKwh })}</span>
              <span className="text-muted-foreground">{t('fields.totalCost')}</span>
              <span className="font-medium">{t('list.cost', { cost: totalCost })}</span>
              <span className="text-muted-foreground">{t('fields.stationName')}</span>
              <span>
                {stationName
                  ? t('list.station', { station: stationName })
                  : t('list.noStation')}
              </span>
              {(socStartPercent != null || socEndPercent != null) && (
                <>
                  <span className="text-muted-foreground">{t('fields.soc')}</span>
                  <span>
                    {socStartPercent != null ? `${String(socStartPercent)}%` : '?'}
                    {' → '}
                    {socEndPercent != null ? `${String(socEndPercent)}%` : '?'}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/vehicles/$vehicleId/charging/$sessionId/edit"
              params={{ vehicleId, sessionId: id }}
            >
              <Button variant="outline" size="sm">
                {t('edit.submit')}
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(id, chargeDate);
              }}
              disabled={isDeleting}
            >
              {t('delete.confirm')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}