import type { ReminderStatusCode } from '@carnotea/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { ListCard } from '@/components/ListCard';
import {
  DeleteAction,
  EditActionIcon,
  editActionClassName,
  MarkDoneAction,
} from '@/components/ListCardActions';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import {
  dueStateKey,
  reminderDueStateBadgeVariant,
  reminderStatusBadgeVariant,
} from '@/features/reminders/badge-variants';
import {
  reminderQueryOptions,
  useDeleteReminder,
  useMarkReminderDone,
} from '@/features/reminders/queries';

export function ReminderDetailPage() {
  const { vehicleId, reminderId }: { vehicleId: string; reminderId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/reminders/$reminderId',
  });
  const { t } = useTranslation('reminders');
  const { t: tc } = useTranslation('common');

  const {
    data: reminder,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(reminderQueryOptions(vehicleId, reminderId));

  const deleteMutation = useDeleteReminder(vehicleId);
  const markDoneMutation = useMarkReminderDone(vehicleId);

  function handleDelete() {
    if (!reminder) return;
    if (window.confirm(t('delete.confirmMessage', { title: reminder.title }))) {
      void deleteMutation.mutateAsync(reminderId);
    }
  }

  function handleMarkDone() {
    void markDoneMutation.mutateAsync(reminderId);
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !reminder) {
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
        to="/vehicles/$vehicleId/reminders"
        params={{ vehicleId }}
        className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {t('detail.backToReminders')}
      </Link>

      <PageHeader
        title={t('detail.title', { title: reminder.title })}
        action={
          <div className="flex items-center gap-1">
            {reminder.status === 'pending' && (
              <MarkDoneAction
                onClick={handleMarkDone}
                disabled={markDoneMutation.isPending}
                label={t('list.markDone')}
              />
            )}
            <Link
              to="/vehicles/$vehicleId/reminders/$reminderId/edit"
              params={{ vehicleId, reminderId }}
              aria-label={tc('actions.edit')}
              title={tc('actions.edit')}
              className={editActionClassName}
            >
              <EditActionIcon />
            </Link>
            <DeleteAction onClick={handleDelete} disabled={deleteMutation.isPending} />
          </div>
        }
      />

      <ListCard
        primary={<span className="font-display text-base font-semibold">{reminder.title}</span>}
        badges={
          <>
            <Badge variant={reminderStatusBadgeVariant[reminder.status] ?? 'default'}>
              {t(`status.${reminder.status as ReminderStatusCode}`)}
            </Badge>
            <Badge variant={reminderDueStateBadgeVariant[reminder.dueState] ?? 'outline'}>
              {t(dueStateKey(reminder.dueState))}
            </Badge>
          </>
        }
      >
        <dl className="divide-y border-t px-4 text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-muted-foreground">{t('fields.dueDate')}</dt>
            <dd className="font-medium">{reminder.dueDate ?? t('list.noDueDate')}</dd>
          </div>

          <div className="flex justify-between py-2.5">
            <dt className="text-muted-foreground">{t('fields.dueMileage')}</dt>
            <dd className="font-medium">
              {reminder.dueMileage != null
                ? t('list.dueMileage', { value: reminder.dueMileage })
                : t('list.noDueMileage')}
            </dd>
          </div>

          {reminder.notifiedAt && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">{t('fields.notifiedAt')}</dt>
              <dd className="font-medium">{reminder.notifiedAt}</dd>
            </div>
          )}

          {reminder.description && (
            <div className="py-2.5">
              <dt className="text-muted-foreground">{t('detail.description')}</dt>
              <dd className="mt-1 whitespace-pre-wrap">{reminder.description}</dd>
            </div>
          )}
        </dl>
      </ListCard>
    </PageContainer>
  );
}
