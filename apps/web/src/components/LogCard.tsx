import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface LogStat {
  label: string;
  value: string;
  highlight?: boolean;
}

interface LogCardProps {
  date: string;
  badges: React.ReactNode;
  stats: LogStat[];
  footer: React.ReactNode;
  actions: React.ReactNode;
}

export function LogCard({ date, badges, stats, footer, actions }: LogCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{date}</span>
            {badges}
          </div>
          <div className="flex items-center gap-1">{actions}</div>
        </div>

        <div className="grid grid-cols-3 gap-px border-y bg-border">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-background px-3 py-2.5 text-center">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn('font-semibold', stat.highlight && 'text-primary')}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground">
          {footer}
        </div>
      </CardContent>
    </Card>
  );
}
