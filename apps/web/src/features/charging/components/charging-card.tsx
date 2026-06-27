import type { ChargerTypeCode } from '@carnotea/shared';
import { Link, useParams } from '@tanstack/react-router';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LogCard } from '@/components/LogCard';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';

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

const chargerTypeBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> =
  {
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
  const { t: tc } = useTranslation('common');

  return (
    <LogCard
      date={chargeDate}
      badges={
        <>
          <Badge variant={chargerTypeBadgeVariant[chargerType] ?? 'default'}>
            {t(`chargerType.${chargerType as ChargerTypeCode}`)}
          </Badge>
          {isFullCharge && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t('list.fullCharge')}
            </span>
          )}
        </>
      }
      stats={[
        { label: t('fields.energyKwh'), value: t('list.energy', { energy: energyKwh }) },
        { label: t('fields.pricePerKwh'), value: t('list.price', { price: pricePerKwh }) },
        { label: t('fields.totalCost'), value: t('list.cost', { cost: totalCost }), highlight: true },
      ]}
      footer={
        <>
          <span>{t('list.mileage', { mileage })}</span>
          {stationName && (
            <>
              <span aria-hidden>{'·'}</span>
              <span className="truncate">{stationName}</span>
            </>
          )}
          {(socStartPercent != null || socEndPercent != null) && (
            <>
              <span aria-hidden>{'·'}</span>
              <span>
                {socStartPercent != null ? `${String(socStartPercent)}%` : '?'}
                {' → '}
                {socEndPercent != null ? `${String(socEndPercent)}%` : '?'}
              </span>
            </>
          )}
        </>
      }
      actions={
        <>
          <Link
            to="/vehicles/$vehicleId/charging/$sessionId/edit"
            params={{ vehicleId, sessionId: id }}
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
              onDelete(id, chargeDate);
            }}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      }
    />
  );
}
