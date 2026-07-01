import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

export const issueStatusBadgeVariant: Record<string, BadgeVariant> = {
  open: 'default',
  in_progress: 'warning',
  resolved: 'success',
  cancelled: 'secondary',
};

export const issuePriorityBadgeVariant: Record<string, BadgeVariant> = {
  low: 'secondary',
  medium: 'default',
  high: 'warning',
  critical: 'destructive',
};
