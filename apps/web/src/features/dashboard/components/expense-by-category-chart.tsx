import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { expensesByCategoryQueryOptions } from '../queries';

const CATEGORY_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  fuel: 'default',
  electricity: 'secondary',
  service: 'outline',
  parts: 'secondary',
  insurance: 'default',
  inspection: 'outline',
  other: 'secondary',
};

export function ExpenseByCategoryChart() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, isError, refetch } = useQuery(expensesByCategoryQueryOptions);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm text-muted-foreground">{t('error.load')}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t('error.retry')}
          </button>
        </CardContent>
      </Card>
    );
  }

  const items = data?.items ?? [];
  const currency = data?.currency ?? '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('expensesByCategory.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('overview.noData')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Badge
                key={item.category}
                variant={CATEGORY_VARIANTS[item.category] ?? 'secondary'}
                className="px-3 py-1.5 text-sm"
              >
                {t(`expenses.categories.${item.category}`, { ns: 'expenses', defaultValue: item.category })}
                {' '}
                {t('expensesByCategory.total', {
                  count: item.count,
                  currency,
                  total: (item.total ?? 0).toFixed(2),
                })}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}