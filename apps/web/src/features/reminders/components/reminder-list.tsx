import { REMINDER_STATUS_CODES } from '@carnotea/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReminderCard } from '@/features/reminders/components/reminder-card';
import {
  remindersQueryOptions,
  useDeleteReminder,
  useMarkReminderDone,
} from '@/features/reminders/queries';

interface RemindersSearchParams {
  status?: string;
}

export function ReminderListPage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/reminders',
  });
  const search: RemindersSearchParams = useSearch({
    from: '/_authenticated/vehicles/$vehicleId/reminders',
  });
  const { t } = useTranslation('reminders');

  const statusFilter = search.status ?? 'all';

  const {
    data: reminders,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(remindersQueryOptions(vehicleId, statusFilter));

  const deleteMutation = useDeleteReminder(vehicleId);
  const markDoneMutation = useMarkReminderDone(vehicleId);

  function handleDelete(id: string, title: string) {
    if (window.confirm(t('delete.confirmMessage', { title }))) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      deleteMutation.mutateAsync(id);
    }
  }

  function handleMarkDone(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    markDoneMutation.mutateAsync(id);
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !reminders) {
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

  const reminderList = Array.isArray(reminders) ? reminders : [];

  return (
    <PageContainer>
      <PageHeader
        title={t('pageTitle')}
        action={
          <Link to="/vehicles/$vehicleId/reminders/new" params={{ vehicleId }}>
            <Button>{t('addReminder')}</Button>
          </Link>
        }
      />

      {/* Status filter */}
      <div className="mb-6 flex items-center gap-2">
        <Label>{t('fields.status')}</Label>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            const searchParams = new URLSearchParams(window.location.search);
            if (value && value !== 'all') {
              searchParams.set('status', value);
            } else {
              searchParams.delete('status');
            }
            const qs = searchParams.toString();
            const base = `/vehicles/${vehicleId}/reminders`;
            window.location.href = qs ? `${base}?${qs}` : base;
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.all')}</SelectItem>
            {REMINDER_STATUS_CODES.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`filter.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reminderList.length === 0 && (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Link to="/vehicles/$vehicleId/reminders/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          }
        />
      )}

      {/* Reminder cards */}
      {reminderList.length > 0 && (
        <div className="space-y-4">
          {reminderList.map(
            (reminder: {
              id: string;
              title: string;
              status: string;
              dueState: string;
              dueDate: string | null;
              dueMileage: number | null;
            }) => (
              <ReminderCard
                key={reminder.id}
                id={reminder.id}
                title={reminder.title}
                status={reminder.status}
                dueState={reminder.dueState}
                dueDate={reminder.dueDate}
                dueMileage={reminder.dueMileage}
                onDelete={handleDelete}
                onMarkDone={handleMarkDone}
                isDeleting={deleteMutation.isPending}
                isMarking={markDoneMutation.isPending}
              />
            ),
          )}
        </div>
      )}
    </PageContainer>
  );
}
