import { ListCard } from '@/components/ListCard';
import { type Stat, StatStrip } from '@/components/StatStrip';

export type LogStat = Stat;

interface LogCardProps {
  date: string;
  badges: React.ReactNode;
  stats: Stat[];
  footer: React.ReactNode;
  actions: React.ReactNode;
}

/**
 * A `ListCard` specialized for transactional logs (fuel, charging): the body is
 * the shared `StatStrip` readout plus a muted footer meta row.
 */
export function LogCard({ date, badges, stats, footer, actions }: LogCardProps) {
  return (
    <ListCard
      primary={<span className="font-display text-base font-semibold tnum">{date}</span>}
      badges={badges}
      actions={actions}
    >
      <StatStrip stats={stats} />

      <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground tnum">
        {footer}
      </div>
    </ListCard>
  );
}
