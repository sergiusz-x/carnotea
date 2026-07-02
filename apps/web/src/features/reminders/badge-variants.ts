import type { DueState } from '@carnotea/shared';

import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export const reminderStatusBadgeVariant: Record<string, BadgeVariant> = {
  pending: 'default',
  done: 'success',
  cancelled: 'secondary',
};

export const reminderDueStateBadgeVariant: Record<string, BadgeVariant> = {
  overdue: 'destructive',
  due_soon: 'warning',
  ok: 'success',
};

// Avoids template-literal type-widening issues with i18next.
export const dueStateKey = (ds: string): `dueState.${DueState}` => `dueState.${ds as DueState}`;
