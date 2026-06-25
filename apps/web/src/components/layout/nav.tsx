import { Link, useLocation } from '@tanstack/react-router';
import { Car, LayoutDashboard, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

const navItems = [
  {
    labelKey: 'dashboard',
    to: '/dashboard',
    activePaths: ['/', '/dashboard'],
    Icon: LayoutDashboard,
  },
  { labelKey: 'vehicles', to: '/vehicles', activePaths: ['/vehicles'], Icon: Car },
  { labelKey: 'profile', to: '/profile', activePaths: ['/profile'], Icon: User },
] as const;

interface NavProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

function isActivePath(pathname: string, activePaths: readonly string[]): boolean {
  return activePaths.some(
    (path) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)),
  );
}

export function Nav({ mobile = false, onNavigate }: NavProps) {
  const { t } = useTranslation('nav');
  const { pathname } = useLocation();

  return (
    <nav aria-label={t('primary')}>
      <ul className={cn('flex', mobile ? 'flex-col gap-1' : 'items-center gap-1')}>
        {navItems.map(({ labelKey, to, activePaths, Icon }) => {
          const isActive = isActivePath(pathname, activePaths);

          return (
            <li key={to}>
              <Link
                to={to}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md font-medium transition-colors',
                  'text-muted-foreground hover:bg-accent hover:text-foreground',
                  isActive && 'bg-accent text-foreground',
                  mobile ? 'w-full px-3 py-3 text-base' : 'px-3 py-2 text-sm',
                )}
              >
                <Icon
                  className={cn('shrink-0', mobile ? 'h-5 w-5' : 'h-4 w-4')}
                  aria-hidden="true"
                />
                {t(labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
