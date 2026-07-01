import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { expensesQueryOptions, useDeleteExpense } from '@/features/expenses/queries';

import { ExpenseCard } from './expense-card';

export function ExpenseListPage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/expenses',
  });
  const { t } = useTranslation('expenses');

  const {
    data: expenses,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(expensesQueryOptions(vehicleId));

  const deleteMutation = useDeleteExpense(vehicleId);

  function handleDelete(id: string, expenseDate: string) {
    if (window.confirm(t('delete.confirmMessage', { date: expenseDate }))) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      deleteMutation.mutateAsync(id);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !expenses) {
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

  const items = Array.isArray(expenses) ? expenses : [];

  return (
    <PageContainer>
      <PageHeader
        title={t('pageTitle')}
        action={
          <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }}>
            <Button>{t('addExpense')}</Button>
          </Link>
        }
      />

      {items.length === 0 && (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          }
        />
      )}

      {/* Expense cards */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map(
            (expense: {
              id: string;
              category: string;
              expenseDate: string;
              amount: number;
              description: string | null;
              sourceType: string;
              sourceId: string | null;
              isAutoSynced: boolean;
            }) => (
              <ExpenseCard
                key={expense.id}
                id={expense.id}
                category={expense.category}
                expenseDate={expense.expenseDate}
                amount={expense.amount}
                description={expense.description}
                sourceType={expense.sourceType}
                isAutoSynced={expense.isAutoSynced}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ),
          )}
        </div>
      )}
    </PageContainer>
  );
}
