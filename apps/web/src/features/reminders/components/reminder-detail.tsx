import type { DueState, ReminderStatusCode } from '@carnotea/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  reminderQueryOptions,
  useDeleteReminder,
  useMarkReminderDone,
} from '@/features/reminders/queries';

// Due-state badge key lookup — avoids template-literal type-widening issues with i18next.
const dueStateKey = (ds: string): `dueState.${DueState}` =>
  `dueState.${ds as DueState}` as `dueState.${DueState}`;

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'default',
  done: 'outline',
  cancelled: 'destructive',
};

const dueStateBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  overdue: 'destructive',
  due_soon: 'secondary',
  ok: 'outline',
};

export function ReminderDetailPage() {
  const { vehicleId, reminderId }: { vehicleId: string; reminderId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/reminders/$reminderId',
  });
  const { t } = useTranslation('reminders');

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
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (isError || !reminder) {
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

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            to="/vehicles/$vehicleId/reminders"
            params={{ vehicleId }}
            className="text-sm text-muted-foreground hover:underline"
          >
            {t('detail.backToReminders')}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{t('detail.title', { title: reminder.title })}</h1>
        </div>
        <div className="flex gap-2">
          {reminder.status === 'pending' && (
            <Button
              variant="default"
              onClick={handleMarkDone}
              disabled={markDoneMutation.isPending}
            >
              {markDoneMutation.isPending ? t('list.marking') : t('list.markDone')}
            </Button>
          )}
          <Link
            to="/vehicles/$vehicleId/reminders/$reminderId/edit"
            params={{ vehicleId, reminderId }}
          >
            <Button variant="outline">{t('edit.submit')}</Button>
          </Link>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {t('delete.confirm')}
          </Button>
        </div>
      </div>

      {/* Badges */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={statusBadgeVariant[reminder.status] ?? 'default'}>
          {t(`status.${reminder.status as ReminderStatusCode}`)}
        </Badge>
        <Badge variant={dueStateBadgeVariant[reminder.dueState] ?? 'outline'}>
          {t(dueStateKey(reminder.dueState))}
        </Badge>
      </div>

      {/* Detail card */}
      <Card>
        <CardHeader>
          <CardTitle>{reminder.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">{t('fields.dueDate')}</dt>
            <dd>{reminder.dueDate ?? t('list.noDueDate')}</dd>

            <dt className="text-muted-foreground">{t('fields.dueMileage')}</dt>
            <dd>
              {reminder.dueMileage != null
                ? t('list.dueMileage', { value: reminder.dueMileage })
                : t('list.noDueMileage')}
            </dd>

            <dt className="text-muted-foreground">{t('fields.status')}</dt>
            <dd>{t(`status.${reminder.status as ReminderStatusCode}`)}</dd>

            <dt className="text-muted-foreground">{t('fields.dueState')}</dt>
            <dd>{t(dueStateKey(reminder.dueState))}</dd>

            {reminder.notifiedAt && (
              <>
                <dt className="text-muted-foreground">{t('fields.notifiedAt')}</dt>
                <dd>{reminder.notifiedAt}</dd>
              </>
            )}

            {reminder.description && (
              <>
                <dt className="text-muted-foreground">{t('detail.description')}</dt>
                <dd className="col-span-2 whitespace-pre-wrap">{reminder.description}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
