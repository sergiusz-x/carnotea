import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import {
  Bell,
  Car,
  CreditCard,
  Droplet,
  Fuel,
  LayoutDashboard,
  TriangleAlert,
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useActiveVehicle } from '@/features/vehicles/active-vehicle-context';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';
import { supportsCharging, supportsFuelLogs } from '@/features/vehicles/vehicle-usage';
import { cn } from '@/lib/utils';

type NavKey =
  | 'dashboard'
  | 'vehicles'
  | 'fuel'
  | 'charging'
  | 'fluidLogs'
  | 'service'
  | 'issues'
  | 'expenses'
  | 'reminders'
  | 'profile';

interface NavItem {
  labelKey: NavKey;
  to: string;
  activePaths: string[];
  Icon: React.ElementType;
  exact?: boolean;
}

function useNavItems(): NavItem[] {
  const { activeVehicleId } = useActiveVehicle();
  const { data: vehicles } = useQuery(vehiclesQueryOptions);

  const activeVehicle = vehicles?.find((v) => v.id === activeVehicleId);
  const showFuel = supportsFuelLogs(activeVehicle?.fuelType);
  const showCharging = supportsCharging(activeVehicle?.fuelType);

  const base: NavItem[] = [
    {
      labelKey: 'dashboard',
      to: '/dashboard',
      activePaths: ['/', '/dashboard'],
      Icon: LayoutDashboard,
    },
    {
      labelKey: 'vehicles',
      to: '/vehicles',
      activePaths: ['/vehicles'],
      Icon: Car,
      exact: true,
    },
  ];

  const vehicleItems: NavItem[] = activeVehicleId
    ? [
        ...(showFuel
          ? [
              {
                labelKey: 'fuel' as NavKey,
                to: `/vehicles/${activeVehicleId}/fuel`,
                activePaths: [`/vehicles/${activeVehicleId}/fuel`],
                Icon: Fuel,
              },
            ]
          : []),
        ...(showCharging
          ? [
              {
                labelKey: 'charging' as NavKey,
                to: `/vehicles/${activeVehicleId}/charging`,
                activePaths: [`/vehicles/${activeVehicleId}/charging`],
                Icon: Zap,
              },
            ]
          : []),
        {
          labelKey: 'fluidLogs',
          to: `/vehicles/${activeVehicleId}/fluid-logs`,
          activePaths: [`/vehicles/${activeVehicleId}/fluid-logs`],
          Icon: Droplet,
        },
        {
          labelKey: 'service',
          to: `/vehicles/${activeVehicleId}/service`,
          activePaths: [`/vehicles/${activeVehicleId}/service`],
          Icon: Wrench,
        },
        {
          labelKey: 'issues',
          to: `/vehicles/${activeVehicleId}/issues`,
          activePaths: [`/vehicles/${activeVehicleId}/issues`],
          Icon: TriangleAlert,
        },
        {
          labelKey: 'expenses',
          to: `/vehicles/${activeVehicleId}/expenses`,
          activePaths: [`/vehicles/${activeVehicleId}/expenses`],
          Icon: CreditCard,
        },
        {
          labelKey: 'reminders',
          to: `/vehicles/${activeVehicleId}/reminders`,
          activePaths: [`/vehicles/${activeVehicleId}/reminders`],
          Icon: Bell,
        },
      ]
    : [];

  const profileItem: NavItem = {
    labelKey: 'profile',
    to: '/profile',
    activePaths: ['/profile'],
    Icon: User,
  };

  return [...base, ...vehicleItems, profileItem];
}

function isActivePath(pathname: string, activePaths: readonly string[], exact = false): boolean {
  return activePaths.some((path) => {
    if (exact) return pathname === path;
    return pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));
  });
}

interface NavProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function Nav({ mobile = false, onNavigate }: NavProps) {
  const { t } = useTranslation('nav');
  const { pathname } = useLocation();
  const items = useNavItems();

  return (
    <nav aria-label={t('primary')}>
      <ul className={cn('flex', mobile ? 'flex-col gap-1' : 'items-center gap-1')}>
        {items.map(({ labelKey, to, activePaths, Icon, exact }) => {
          const isActive = isActivePath(pathname, activePaths, exact);

          return (
            <li key={to}>
              <Link
                to={to}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-colors',
                  'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  isActive && 'bg-accent/70 text-primary',
                  isActive &&
                    'before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-full before:bg-primary',
                  mobile && 'w-full',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
