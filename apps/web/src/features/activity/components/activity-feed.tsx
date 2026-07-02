import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';

import { activityFeedInfiniteQueryOptions } from '../queries';

import { ActivityEntryCard } from './activity-entry';

const FILTERS = ['all', 'charge', 'fuel', 'service', 'expense', 'issue', 'reminder'] as const;

type ActivityFilter = (typeof FILTERS)[number];

export function ActivityFeed({
  vehicleId,
  currency,
  locale,
}: {
  vehicleId: string;
  currency: string;
  locale: string;
}) {
  const { t } = useTranslation('activity');
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(activityFeedInfiniteQueryOptions(vehicleId));

  const entries = useMemo(() => {
    const items = data?.pages.flatMap((page) => page.items) ?? [];
    return filter === 'all' ? items : items.filter((entry) => entry.kind === filter);
  }, [data, filter]);

  if (isLoading) {
    return <EmptyState title={t('feed.loading')} />;
  }

  if (isError) {
    return (
      <ErrorState
        message={t('feed.error')}
        onRetry={() => void refetch()}
        retryLabel={t('feed.retry')}
      />
    );
  }

  if (entries.length === 0) {
    return <EmptyState title={t('feed.emptyTitle')} description={t('feed.emptyDescription')} />;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold tracking-tight">{t('feed.title')}</h2>
        <div className="flex flex-wrap gap-2" aria-label={t('feed.filters')}>
          {FILTERS.map((item) => (
            <Button
              key={item}
              type="button"
              variant={filter === item ? 'default' : 'outline'}
              size="sm"
              aria-pressed={filter === item}
              onClick={() => {
                setFilter(item);
              }}
            >
              {t(`filter.${item}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <ActivityEntryCard
            key={`${entry.kind}-${entry.id}`}
            entry={entry}
            vehicleId={vehicleId}
            currency={currency}
            locale={locale}
          />
        ))}
      </div>

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? t('feed.loading') : t('feed.loadMore')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
