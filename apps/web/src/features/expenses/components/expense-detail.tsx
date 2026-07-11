import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { expenseQueryOptions, useDeleteExpense } from '@/features/expenses/queries';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';

export function ExpenseDetailPage() {
  const { vehicleId, expenseId }: { vehicleId: string; expenseId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/expenses/$expenseId',
  });
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('expenses');
  const { t: tc } = useTranslation('common');
  const currency = useCurrencyPref();
  const locale = i18n.resolvedLanguage ?? 'en';

  const {
    data: expense,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(expenseQueryOptions(vehicleId, expenseId));

  const deleteMutation = useDeleteExpense(vehicleId);

  async function handleDelete() {
    if (!expense) return;
    if (window.confirm(t('delete.confirmMessage', { date: expense.expenseDate }))) {
      await deleteMutation.mutateAsync(expenseId);
      await navigate({ to: '/vehicles/$vehicleId/expenses', params: { vehicleId } });
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !expense) {
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

  return (
    <PageContainer>
      <Link
        to="/vehicles/$vehicleId/expenses"
        params={{ vehicleId }}
        className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {t('detail.backToExpenses')}
      </Link>

      <PageHeader
        title={t('detail.title', { date: expense.expenseDate })}
        action={
          <div className="flex items-center gap-1">
            <Link
              to="/vehicles/$vehicleId/expenses/$expenseId/edit"
              params={{ vehicleId, expenseId }}
              aria-label={tc('actions.edit')}
              title={tc('actions.edit')}
              className={editActionClassName}
            >
              <EditActionIcon />
            </Link>
            <DeleteAction onClick={() => void handleDelete()} disabled={deleteMutation.isPending} />
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">
              {t(`categories.${expense.category}` as const, { defaultValue: expense.category })}
            </Badge>
            {expense.isAutoSynced ? <Badge variant="outline">{t('list.autoSynced')}</Badge> : null}
          </div>
          <p className="mt-4 font-display text-3xl font-semibold text-primary">
            {formatMoney(expense.amount, currency, locale)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <dl className="divide-y text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">{t('fields.category')}</dt>
              <dd className="font-medium">
                {t(`categories.${expense.category}` as const, { defaultValue: expense.category })}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">{t('fields.sourceType')}</dt>
              <dd className="font-medium">
                {t(`sources.${expense.sourceType}` as const, { defaultValue: expense.sourceType })}
              </dd>
            </div>
            <div className="py-2.5">
              <dt className="text-muted-foreground">{t('fields.description')}</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">
                {expense.description || t('list.noDescription')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
