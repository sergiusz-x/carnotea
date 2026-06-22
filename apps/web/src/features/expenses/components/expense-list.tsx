import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (isError || !expenses) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="space-y-4">
          <p>{t('error.load')}</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void refetch();
            }}
          >
            {t('error.retry')}
          </button>
        </div>
      </div>
    );
  }

  const items = Array.isArray(expenses) ? expenses : [];

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }}>
          <Button>{t('addExpense')}</Button>
        </Link>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('empty.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t('empty.description')}</p>
            <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          </CardContent>
        </Card>
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
                editLink={
                  <Link
                    to="/vehicles/$vehicleId/expenses/$expenseId/edit"
                    params={{ vehicleId, expenseId: expense.id }}
                  >
                    <Button variant="outline" size="sm">
                      {t('edit.submit')}
                    </Button>
                  </Link>
                }
                deleteButton={
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleDelete(expense.id, expense.expenseDate);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {t('delete.confirm')}
                  </Button>
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}