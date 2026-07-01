import type { ChargerTypeCode } from '@carnotea/shared';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { LogCard } from '@/components/LogCard';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';

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
  const { t, i18n } = useTranslation('charging');
  const { t: tc } = useTranslation('common');
  const currency = useCurrencyPref();
  const locale = i18n.resolvedLanguage ?? 'en';

  return (
    <LogCard
      date={chargeDate}
      badges={
        <>
          <Badge variant={chargerTypeBadgeVariant[chargerType] ?? 'default'}>
            {t(`chargerType.${chargerType as ChargerTypeCode}`)}
          </Badge>
          {isFullCharge && <Badge variant="secondary">{t('list.fullCharge')}</Badge>}
        </>
      }
      stats={[
        { label: t('fields.energyKwh'), value: t('list.energy', { energy: energyKwh }) },
        {
          label: t('fields.pricePerKwh'),
          value: formatMoney(pricePerKwh, currency, locale),
        },
        {
          label: t('fields.totalCost'),
          value: formatMoney(totalCost, currency, locale),
          highlight: true,
        },
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
            title={tc('actions.edit')}
            className={editActionClassName}
          >
            <EditActionIcon />
          </Link>
          <DeleteAction
            onClick={() => {
              onDelete(id, chargeDate);
            }}
            disabled={isDeleting}
          />
        </>
      }
    />
  );
}
