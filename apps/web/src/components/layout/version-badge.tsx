import { useTranslation } from 'react-i18next';

import { buildInfo, formatBuildInfoLabel } from '@/lib/build-info';

export function VersionBadge() {
  const { t } = useTranslation('common');
  const label = formatBuildInfoLabel(buildInfo);

  return (
    <a
      href="/version.json"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-20 right-3 z-40 inline-flex items-center rounded-md border bg-background/95 px-2 py-1 font-mono text-[11px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground md:bottom-4"
      aria-label={t('version.linkLabel', { version: label })}
      title={t('version.title', { version: label })}
    >
      {label}
    </a>
  );
}
