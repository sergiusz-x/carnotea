import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ListCard } from '@/components/ListCard';
import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { StatStrip } from '@/components/StatStrip';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';

interface ServicePart {
  id: string;
  name: string;
  manufacturer: string | null;
  partNumber: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
}

interface ServiceRecord {
  id: string;
  serviceDate: string;
  mileage: number;
  title: string;
  description: string | null;
  laborCost: number;
  totalCost: number;
  workshopName: string | null;
  parts: ServicePart[];
}

export function ServiceCard({
  record,
  onDelete,
  isDeleting,
}: {
  record: ServiceRecord;
  onDelete: (id: string, title: string) => void;
  isDeleting: boolean;
}) {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/service',
  });
  const { t, i18n } = useTranslation('service');
  const { t: tc } = useTranslation('common');
  const currency = useCurrencyPref();
  const locale = i18n.resolvedLanguage ?? 'en';

  return (
    <ListCard
      primary={
        <span className="font-display text-base font-semibold tnum">{record.serviceDate}</span>
      }
      actions={
        <>
          <Link
            to="/vehicles/$vehicleId/service/$recordId/edit"
            params={{ vehicleId, recordId: record.id }}
            aria-label={tc('actions.edit')}
            title={tc('actions.edit')}
            className={editActionClassName}
          >
            <EditActionIcon />
          </Link>
          <DeleteAction
            onClick={() => {
              onDelete(record.id, record.title);
            }}
            disabled={isDeleting}
          />
        </>
      }
    >
      <div className="px-4 pb-3 pt-0.5">
        <h3 className="font-display text-base font-semibold">{record.title}</h3>
        {record.workshopName && (
          <p className="text-sm text-muted-foreground">{record.workshopName}</p>
        )}
      </div>

      <StatStrip
        stats={[
          { label: t('fields.mileage'), value: t('list.mileage', { mileage: record.mileage }) },
          { label: t('fields.laborCost'), value: formatMoney(record.laborCost, currency, locale) },
          {
            label: t('fields.totalCost'),
            value: formatMoney(record.totalCost, currency, locale),
            highlight: true,
          },
        ]}
      />

      <div className="flex flex-wrap gap-1 px-4 py-2.5">
        {record.parts.length > 0 ? (
          <>
            <Badge variant="secondary">{t('list.partCount', { count: record.parts.length })}</Badge>
            {record.parts.slice(0, 3).map((part) => (
              <Badge key={part.id} variant="outline">
                {part.name}
              </Badge>
            ))}
            {record.parts.length > 3 && (
              <Badge variant="outline">{`+${String(record.parts.length - 3)}`}</Badge>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{t('list.noParts')}</span>
        )}
      </div>
    </ListCard>
  );
}
