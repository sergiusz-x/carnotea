import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ListCard } from '@/components/ListCard';
import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';

interface ExpenseCardProps {
  id: string;
  category: string;
  expenseDate: string;
  amount: number;
  description: string | null;
  sourceType: string;
  isAutoSynced: boolean;
  onDelete: (id: string, expenseDate: string) => void;
  isDeleting: boolean;
}

export function ExpenseCard({
  id,
  category,
  expenseDate,
  amount,
  description,
  isAutoSynced,
  onDelete,
  isDeleting,
}: ExpenseCardProps) {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/expenses',
  });
  const { t, i18n } = useTranslation('expenses');
  const { t: tc } = useTranslation('common');
  const currency = useCurrencyPref();
  const locale = i18n.resolvedLanguage ?? 'en';

  return (
    <ListCard
      primary={
        <Link
          to="/vehicles/$vehicleId/expenses/$expenseId"
          params={{ vehicleId, expenseId: id }}
          className="font-display text-base font-semibold tnum hover:underline"
        >
          {expenseDate}
        </Link>
      }
      badges={
        <>
          <Badge variant="default">
            {t(`categories.${category}` as const, { defaultValue: category })}
          </Badge>
          {isAutoSynced && <Badge variant="outline">{t('list.autoSynced')}</Badge>}
        </>
      }
      actions={
        <>
          <Link
            to="/vehicles/$vehicleId/expenses/$expenseId/edit"
            params={{ vehicleId, expenseId: id }}
            aria-label={tc('actions.edit')}
            title={tc('actions.edit')}
            className={editActionClassName}
          >
            <EditActionIcon />
          </Link>
          <DeleteAction
            onClick={() => {
              onDelete(id, expenseDate);
            }}
            disabled={isDeleting}
          />
        </>
      }
    >
      <div className="space-y-0.5 px-4 pb-4 pt-0.5">
        <p className="font-display tnum text-xl font-semibold text-primary">
          {formatMoney(amount, currency, locale)}
        </p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    </ListCard>
  );
}
