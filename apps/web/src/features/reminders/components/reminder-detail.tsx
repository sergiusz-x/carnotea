import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
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

  const mode = reminder.mode;

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

      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap gap-2 border-b px-4 py-4">
          <Badge variant="outline">{t(`mode.${mode}`)}</Badge>
          <Badge variant={reminderStatusBadgeVariant[reminder.status] ?? 'default'}>
            {t(`status.${reminder.status}`)}
          </Badge>
          <Badge variant={reminderDueStateBadgeVariant[reminder.dueState] ?? 'outline'}>
            {t(dueStateKey(reminder.dueState))}
          </Badge>
        </div>

        <dl className="divide-y px-4 text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-muted-foreground">{t('fields.mode')}</dt>
            <dd className="font-medium">{t(`mode.${mode}`)}</dd>
          </div>

          {mode === 'one_off' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">{t('fields.nextDueDate')}</dt>
                <dd className="font-medium">{reminder.nextDueDate ?? t('list.noNextDueDate')}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">{t('fields.nextDueMileage')}</dt>
                <dd className="font-medium">
                  {reminder.nextDueMileage != null
                    ? t('list.nextDueMileage', { value: reminder.nextDueMileage })
                    : t('list.noNextDueMileage')}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">{t('fields.intervalKm')}</dt>
                <dd className="font-medium">
                  {reminder.intervalKm != null
                    ? t('detail.intervalKm', { value: reminder.intervalKm })
                    : t('detail.noIntervalKm')}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">{t('fields.intervalMonths')}</dt>
                <dd className="font-medium">
                  {reminder.intervalMonths != null
                    ? t('detail.intervalMonths', { value: reminder.intervalMonths })
                    : t('detail.noIntervalMonths')}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">{t('fields.lastPerformedDate')}</dt>
                <dd className="font-medium">
                  {reminder.lastPerformedDate ?? t('detail.noLastPerformedDate')}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-muted-foreground">{t('fields.lastPerformedMileage')}</dt>
                <dd className="font-medium">
                  {reminder.lastPerformedMileage != null
                    ? t('detail.lastPerformedMileage', { value: reminder.lastPerformedMileage })
                    : t('detail.noLastPerformedMileage')}
                </dd>
              </div>
            </>
          )}

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
      </div>
    </PageContainer>
  );
}
