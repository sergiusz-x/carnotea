import type { FluidTypeCode } from '@carnotea/shared';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { LogCard } from '@/components/LogCard';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';

interface FluidLogCardProps {
  id: string;
  changeDate: string;
  mileage: number;
  fluidType: string;
  quantityLiters: number | null;
  cost: number | null;
  workshopName: string | null;
  nextDueMileage: number | null;
  nextDueDate: string | null;
  onDelete: (id: string, changeDate: string) => void;
  isDeleting: boolean;
}

const fluidTypeBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  engine_oil: 'default',
  oil_filter: 'secondary',
  brake_fluid: 'outline',
  coolant: 'outline',
  power_steering_fluid: 'secondary',
  washer_fluid: 'secondary',
  transmission_fluid: 'default',
  other: 'secondary',
};

export function FluidLogCard({
  id,
  changeDate,
  mileage,
  fluidType,
  quantityLiters,
  cost,
  workshopName,
  nextDueMileage,
  nextDueDate,
  onDelete,
  isDeleting,
}: FluidLogCardProps) {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fluid-logs',
  });
  const { t, i18n } = useTranslation('fluid-logs');
  const { t: tc } = useTranslation('common');
  const currency = useCurrencyPref();
  const locale = i18n.resolvedLanguage ?? 'en';

  const stats = [
    ...(quantityLiters != null
      ? [
          {
            label: t('fields.quantityLiters'),
            value: t('list.quantity', { quantity: quantityLiters }),
          },
        ]
      : []),
    ...(cost != null
      ? [{ label: t('fields.cost'), value: formatMoney(cost, currency, locale), highlight: true }]
      : []),
  ];

  return (
    <LogCard
      date={changeDate}
      badges={
        <Badge variant={fluidTypeBadgeVariant[fluidType] ?? 'default'}>
          {t(`fluidType.${fluidType as FluidTypeCode}`)}
        </Badge>
      }
      stats={stats}
      footer={
        <>
          <span>{t('list.mileage', { mileage })}</span>
          {workshopName && (
            <>
              <span aria-hidden>{'·'}</span>
              <span className="truncate">{workshopName}</span>
            </>
          )}
          {(nextDueMileage != null || nextDueDate != null) && (
            <>
              <span aria-hidden>{'·'}</span>
              <span>
                {t('list.nextDue', {
                  mileage: nextDueMileage ?? '—',
                  date: nextDueDate ?? '—',
                })}
              </span>
            </>
          )}
        </>
      }
      actions={
        <>
          <Link
            to="/vehicles/$vehicleId/fluid-logs/$logId/edit"
            params={{ vehicleId, logId: id }}
            aria-label={tc('actions.edit')}
            title={tc('actions.edit')}
            className={editActionClassName}
          >
            <EditActionIcon />
          </Link>
          <DeleteAction
            onClick={() => {
              onDelete(id, changeDate);
            }}
            disabled={isDeleting}
          />
        </>
      }
    />
  );
}
