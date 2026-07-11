import { useTranslation } from 'react-i18next';

import { buildInfo, formatBuildInfoLabel } from '@/lib/build-info';
import { cn } from '@/lib/utils';

interface VersionBadgeProps {
  className?: string;
}

export function VersionBadge({ className }: VersionBadgeProps) {
  const { t } = useTranslation('common');
  const label = formatBuildInfoLabel(buildInfo);

  return (
    <a
      href="/version.json"
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-center rounded-md border bg-background/95 px-2 py-1 font-mono text-[11px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      aria-label={t('version.linkLabel', { version: label })}
      title={t('version.title', { version: label })}
    >
      {label}
    </a>
  );
}
