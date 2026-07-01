import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ListCardProps {
  /** Leading element of the header — a date or a title (optionally a link). */
  primary: React.ReactNode;
  /** Badges/chips rendered next to the primary element. */
  badges?: React.ReactNode;
  /** Action controls (edit / delete / …) rendered on the right of the header. */
  actions?: React.ReactNode;
  /** Feature-specific body. Rendered edge-to-edge; add your own padding. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Shared chrome for every list-item card in the app: a shadcn `Card` with a
 * consistent header (primary + badges on the left, actions on the right) and a
 * flexible body. Features either use this directly (service, expenses, issues,
 * reminders) or via `LogCard`, which layers a stats grid on top (fuel,
 * charging). Keeps containers, spacing, and action placement identical across
 * tabs while letting each feature render its own data.
 */
export function ListCard({ primary, badges, actions, children, className }: ListCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {primary}
            {badges}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
