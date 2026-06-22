import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { monthlySpendQueryOptions } from '../queries';

export function MonthlySpend() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, isError, refetch } = useQuery(monthlySpendQueryOptions);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
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

  const items = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('monthlySpend.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('overview.noData')}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${String(item.year)}-${String(item.month)}`}
                className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0"
              >
                <span className="text-sm text-muted-foreground">
                  {t('monthlySpend.month', {
                    year: item.year,
                    month: String(item.month).padStart(2, '0'),
                  })}
                </span>
                <span className="font-medium">
                  {item.total != null
                    ? t('monthlySpend.total', {
                        currency: item.currency,
                        total: item.total.toFixed(2),
                      })
                    : t('overview.noData')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}