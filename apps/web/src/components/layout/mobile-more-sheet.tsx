import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Bell, Car, CreditCard, TriangleAlert, User, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';
import { cn } from '@/lib/utils';

type MoreKey = 'charging' | 'issues' | 'expenses' | 'reminders' | 'vehicles' | 'profile';

interface MoreItem {
  labelKey: MoreKey;
  to: string | null;
  Icon: React.ElementType;
}

interface MobileMoreSheetProps {
  vehicleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMoreSheet({ vehicleId, open, onOpenChange }: MobileMoreSheetProps) {
  const { t } = useTranslation('nav');
  const { data: vehicles } = useQuery(vehiclesQueryOptions);

  const activeVehicle = vehicles?.find((v) => v.id === vehicleId);
  const isChargingVehicle =
    activeVehicle?.fuelType === 'electric' || activeVehicle?.fuelType === 'hybrid';

  const chargingItem: MoreItem[] = isChargingVehicle
    ? [
        {
          labelKey: 'charging',
          to: vehicleId ? `/vehicles/${vehicleId}/charging` : null,
          Icon: Zap,
        },
      ]
    : [];

  const items: MoreItem[] = [
    ...chargingItem,
    {
      labelKey: 'issues',
      to: vehicleId ? `/vehicles/${vehicleId}/issues` : null,
      Icon: TriangleAlert,
    },
    {
      labelKey: 'expenses',
      to: vehicleId ? `/vehicles/${vehicleId}/expenses` : null,
      Icon: CreditCard,
    },
    {
      labelKey: 'reminders',
      to: vehicleId ? `/vehicles/${vehicleId}/reminders` : null,
      Icon: Bell,
    },
    { labelKey: 'vehicles', to: '/vehicles', Icon: Car },
    { labelKey: 'profile', to: '/profile', Icon: User },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader className="text-left">
          <SheetTitle>{t('more')}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t('more')} className="mt-4 pb-4">
          <ul className="grid grid-cols-3 gap-3">
            {items.map(({ labelKey, to, Icon }) => (
              <li key={labelKey}>
                {to ? (
                  <Link
                    to={to}
                    onClick={() => {
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {t(labelKey)}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium',
                      'cursor-default select-none text-muted-foreground/40',
                    )}
                    aria-disabled="true"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {t(labelKey)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
