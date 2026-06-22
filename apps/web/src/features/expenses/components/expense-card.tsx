import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@/components/ui/card';

interface ExpenseCardProps {
  id: string;
  category: string;
  expenseDate: string;
  amount: number;
  description: string | null;
  sourceType: string;
  isAutoSynced: boolean;
  editLink: React.ReactNode;
  deleteButton: React.ReactNode;
}

export function ExpenseCard({
  category,
  expenseDate,
  amount,
  description,
  isAutoSynced,
  editLink,
  deleteButton,
}: ExpenseCardProps) {
  const { t } = useTranslation('expenses');

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{expenseDate}</span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {t(`categories.${category}` as const, {
                  defaultValue: category,
                })}
              </span>
              {isAutoSynced && (
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {t('list.autoSynced')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">{t('fields.amount')}</span>
              <span className="font-medium">{t('list.amount', { amount })}</span>
              {description && (
                <>
                  <span className="text-muted-foreground">{t('fields.description')}</span>
                  <span>{description}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {editLink}
            {deleteButton}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
