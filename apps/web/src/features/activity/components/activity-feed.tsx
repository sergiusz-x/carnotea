import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { supportsCharging, supportsFuelLogs } from '@/features/vehicles/vehicle-usage';

import type { VehiclePanelData } from '../queries';
import { activityFeedInfiniteQueryOptions } from '../queries';

import { ActivityEntryCard } from './activity-entry';

const FILTERS = [
  'all',
  'charge',
  'fuel',
  'fluid',
  'service',
  'expense',
  'issue',
  'reminder',
] as const;

type ActivityFilter = (typeof FILTERS)[number];

function isFilterVisible(filter: ActivityFilter, fuelType: VehiclePanelData['fuelType']): boolean {
  switch (filter) {
    case 'all':
    case 'fluid':
    case 'service':
    case 'expense':
    case 'issue':
    case 'reminder':
      return true;
    case 'fuel':
      return supportsFuelLogs(fuelType);
    case 'charge':
      return supportsCharging(fuelType);
  }
}

export function ActivityFeed({
  vehicleId,
  currency,
  locale,
  fuelType,
}: {
  vehicleId: string;
  currency: string;
  locale: string;
  fuelType: VehiclePanelData['fuelType'];
}) {
  const { t } = useTranslation('activity');
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(activityFeedInfiniteQueryOptions(vehicleId));

  const visibleFilters = useMemo(
    () => FILTERS.filter((item) => isFilterVisible(item, fuelType)),
    [fuelType],
  );
  const activeFilter = visibleFilters.includes(filter) ? filter : 'all';

  const allEntries = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  const entries = useMemo(() => {
    return activeFilter === 'all'
      ? allEntries
      : allEntries.filter((entry) => entry.kind === activeFilter);
  }, [activeFilter, allEntries]);

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

  const showFeedEmpty = allEntries.length === 0;
  const showFilteredEmpty = !showFeedEmpty && entries.length === 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold tracking-tight">{t('feed.title')}</h2>
        <div className="flex flex-wrap gap-2" aria-label={t('feed.filters')}>
          {visibleFilters.map((item) => (
            <Button
              key={item}
              type="button"
              variant={activeFilter === item ? 'default' : 'outline'}
              size="sm"
              aria-pressed={activeFilter === item}
              onClick={() => {
                setFilter(item);
              }}
            >
              {t(`filter.${item}`)}
            </Button>
          ))}
        </div>
      </div>

      {showFeedEmpty ? (
        <EmptyState title={t('feed.emptyTitle')} description={t('feed.emptyDescription')} />
      ) : showFilteredEmpty ? (
        <EmptyState
          title={t('feed.filteredEmptyTitle')}
          description={t('feed.filteredEmptyDescription', {
            filter: t(`filter.${activeFilter}`),
          })}
        />
      ) : (
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
      )}

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
