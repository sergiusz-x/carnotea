import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

const navItems = [
  { labelKey: 'vehicles', to: '/vehicles' },
  { labelKey: 'dashboard', to: '/dashboard' },
  { labelKey: 'profile', to: '/profile' },
] as const;

export function Nav() {
  const { t } = useTranslation('nav');

  return (
    <nav aria-label={t('primary')}>
      <ul className="flex items-center gap-1">
        {navItems.map(({ labelKey, to }) => (
          <li key={to}>
            <Link
              to={to}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                '[&.active]:bg-accent [&.active]:text-accent-foreground',
              )}
              activeProps={{ className: 'active' }}
            >
              {t(labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
