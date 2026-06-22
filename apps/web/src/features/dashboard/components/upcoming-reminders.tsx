import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { upcomingRemindersQueryOptions } from '../queries';

export function UpcomingReminders() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, isError, refetch } = useQuery(upcomingRemindersQueryOptions);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
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
        <CardTitle className="text-lg">{t('upcomingReminders.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('upcomingReminders.empty')}</p>
        ) : (
          <div className="space-y-4">
            {items.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-start justify-between border-b pb-3 last:border-b-0 last:pb-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{reminder.title}</span>
                    <Badge
                      variant={reminder.dueState === 'overdue' ? 'destructive' : 'secondary'}
                      className="px-2 py-0 text-xs"
                    >
                      {reminder.dueState === 'overdue'
                        ? t('upcomingReminders.overdue')
                        : t('upcomingReminders.dueSoon')}
                    </Badge>
                  </div>
                  {reminder.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      {t('upcomingReminders.dueDate', { date: reminder.dueDate })}
                    </p>
                  )}
                  {reminder.dueMileage != null && (
                    <p className="text-xs text-muted-foreground">
                      {t('upcomingReminders.dueMileage', { value: reminder.dueMileage })}
                    </p>
                  )}
                </div>
                <Link
                  to="/vehicles/$vehicleId/reminders"
                  params={{ vehicleId: reminder.vehicleId }}
                  className="text-xs font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  {t('upcomingReminders.viewVehicle')}
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}