import { cn } from '@/lib/utils';

export interface Stat {
  label: string;
  value: string;
  /** Render the value in the brand accent (e.g. the headline total). */
  highlight?: boolean;
}

/**
 * The app's signature element: a trip-computer readout. A row of tabular
 * numerals under tiny uppercase micro-labels, separated by hairlines. Shared by
 * `LogCard` (fuel, charging) and used directly by service/expenses so every
 * numeric entry reads the same way.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="grid gap-px border-y bg-border"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(6.5rem, 1fr))' }}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card px-3 py-2.5 text-center">
          <p className="label-micro">{stat.label}</p>
          <p
            className={cn(
              'font-display tnum text-base font-semibold',
              stat.highlight && 'text-primary',
            )}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
