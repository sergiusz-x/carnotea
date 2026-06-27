import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useActiveVehicle } from '@/features/vehicles/active-vehicle-context';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';

interface VehiclePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehiclePickerSheet({ open, onOpenChange }: VehiclePickerSheetProps) {
  const { t } = useTranslation('nav');
  const navigate = useNavigate();
  const { activeVehicleId, setActiveVehicleId } = useActiveVehicle();
  const { data: vehicles } = useQuery(vehiclesQueryOptions);

  function handleSelect(id: string) {
    setActiveVehicleId(id);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader className="text-left">
          <SheetTitle>{t('selectVehicle')}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 pb-4">
          {vehicles?.map((vehicle) => (
            <Button
              key={vehicle.id}
              variant={vehicle.id === activeVehicleId ? 'secondary' : 'outline'}
              className="w-full justify-between"
              onClick={() => {
                handleSelect(vehicle.id);
              }}
            >
              <span>
                {vehicle.brand} {vehicle.model} {vehicle.productionYear}
              </span>
              {vehicle.id === activeVehicleId && (
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => {
              onOpenChange(false);
              void navigate({ to: '/vehicles/new' });
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('addVehicle')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
