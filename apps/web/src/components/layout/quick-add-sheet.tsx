import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Bell, CreditCard, Fuel, TriangleAlert, Wrench, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';

type QuickAddKey = 'fuel' | 'charging' | 'service' | 'issues' | 'expenses' | 'reminders';

interface QuickAddAction {
  labelKey: QuickAddKey;
  to: string;
  Icon: React.ElementType;
}

interface QuickAddSheetProps {
  vehicleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddSheet({ vehicleId, open, onOpenChange }: QuickAddSheetProps) {
  const { t } = useTranslation(['nav', 'common']);
  const navigate = useNavigate();
  const { data: vehicles } = useQuery(vehiclesQueryOptions);

  const activeVehicle = vehicles?.find((v) => v.id === vehicleId);
  const showFuel = activeVehicle?.fuelType !== 'electric';
  const showCharging =
    activeVehicle?.fuelType === 'electric' || activeVehicle?.fuelType === 'hybrid';

  const fuelAction: QuickAddAction[] = showFuel
    ? [{ labelKey: 'fuel', to: `/vehicles/${vehicleId}/fuel/new`, Icon: Fuel }]
    : [];

  const chargingAction: QuickAddAction[] = showCharging
    ? [{ labelKey: 'charging', to: `/vehicles/${vehicleId}/charging/new`, Icon: Zap }]
    : [];

  const actions: QuickAddAction[] = [
    ...fuelAction,
    ...chargingAction,
    { labelKey: 'service', to: `/vehicles/${vehicleId}/service/new`, Icon: Wrench },
    { labelKey: 'issues', to: `/vehicles/${vehicleId}/issues/new`, Icon: TriangleAlert },
    { labelKey: 'expenses', to: `/vehicles/${vehicleId}/expenses/new`, Icon: CreditCard },
    { labelKey: 'reminders', to: `/vehicles/${vehicleId}/reminders/new`, Icon: Bell },
  ];

  function handleNavigate(to: string) {
    onOpenChange(false);
    void navigate({ to });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" aria-describedby={undefined} closeLabel={t('common:nav.close')}>
        <SheetHeader className="text-left">
          <SheetTitle>{t('quickAdd')}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-2 gap-3 pb-4">
          {actions.map(({ labelKey, to, Icon }) => (
            <Button
              key={labelKey}
              variant="outline"
              className="h-16 flex-col gap-1.5 text-sm"
              onClick={() => {
                handleNavigate(to);
              }}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
