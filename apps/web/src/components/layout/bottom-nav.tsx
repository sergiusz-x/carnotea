import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { Bell, Fuel, LayoutDashboard, MoreHorizontal, User, Wrench, Zap } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveVehicle } from '@/features/vehicles/active-vehicle-context';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';
import { cn } from '@/lib/utils';

import { MobileMoreSheet } from './mobile-more-sheet';

type BottomTabKey = 'dashboard' | 'fuel' | 'charging' | 'service' | 'reminders' | 'profile';

interface BottomTab {
  labelKey: BottomTabKey;
  Icon: React.ElementType;
  to: string | null;
  activePaths: string[];
}

function useTabs(): BottomTab[] {
  const { activeVehicleId } = useActiveVehicle();
  const { data: vehicles } = useQuery(vehiclesQueryOptions);

  const activeVehicle = vehicles?.find((v) => v.id === activeVehicleId);
  const isElectric = activeVehicle?.fuelType === 'electric';

  const energyTab: BottomTab = isElectric
    ? {
        labelKey: 'charging',
        Icon: Zap,
        to: activeVehicleId ? `/vehicles/${activeVehicleId}/charging` : null,
        activePaths: activeVehicleId ? [`/vehicles/${activeVehicleId}/charging`] : [],
      }
    : {
        labelKey: 'fuel',
        Icon: Fuel,
        to: activeVehicleId ? `/vehicles/${activeVehicleId}/fuel` : null,
        activePaths: activeVehicleId ? [`/vehicles/${activeVehicleId}/fuel`] : [],
      };

  return [
    {
      labelKey: 'dashboard',
      Icon: LayoutDashboard,
      to: '/dashboard',
      activePaths: ['/', '/dashboard'],
    },
    energyTab,
    {
      labelKey: 'service',
      Icon: Wrench,
      to: activeVehicleId ? `/vehicles/${activeVehicleId}/service` : null,
      activePaths: activeVehicleId ? [`/vehicles/${activeVehicleId}/service`] : [],
    },
    {
      labelKey: 'reminders',
      Icon: Bell,
      to: activeVehicleId ? `/vehicles/${activeVehicleId}/reminders` : null,
      activePaths: activeVehicleId ? [`/vehicles/${activeVehicleId}/reminders`] : [],
    },
    {
      labelKey: 'profile',
      Icon: User,
      to: '/profile',
      activePaths: ['/profile'],
    },
  ];
}

function isActivePath(pathname: string, activePaths: string[]): boolean {
  return activePaths.some(
    (path) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)),
  );
}

export function BottomNav() {
  const { t } = useTranslation('nav');
  const { pathname } = useLocation();
  const { activeVehicleId } = useActiveVehicle();
  const tabs = useTabs();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label={t('primary')}
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
      >
        <ul className="flex h-16 items-stretch">
          {tabs.map(({ labelKey, Icon, to, activePaths }) => {
            const isActive = isActivePath(pathname, activePaths);
            const isDisabled = to === null;

            return (
              <li key={labelKey} className="flex flex-1">
                {to !== null ? (
                  <Link
                    to={to}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span>{t(labelKey)}</span>
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className={cn(
                      'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium',
                      'cursor-default text-muted-foreground/40',
                      isDisabled && 'select-none',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span>{t(labelKey)}</span>
                  </span>
                )}
              </li>
            );
          })}

          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => {
                setMoreOpen(true);
              }}
              aria-expanded={moreOpen}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              <span>{t('more')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <MobileMoreSheet vehicleId={activeVehicleId} open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
