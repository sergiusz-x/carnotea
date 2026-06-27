import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Car, Check, ChevronDown, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActiveVehicle } from '@/features/vehicles/active-vehicle-context';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';

interface VehiclePickerProps {
  className?: string;
}

export function VehiclePicker({ className }: VehiclePickerProps) {
  const { t } = useTranslation('nav');
  const navigate = useNavigate();
  const { activeVehicleId, setActiveVehicleId } = useActiveVehicle();
  const { data: vehicles } = useQuery(vehiclesQueryOptions);

  const activeVehicle = vehicles?.find((v) => v.id === activeVehicleId);
  const label = activeVehicle
    ? `${activeVehicle.brand} ${activeVehicle.model}`
    : t('selectVehicle');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className ?? 'h-8 max-w-[200px] gap-1.5 truncate'}
          aria-label={label}
        >
          <Car className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate text-sm">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {vehicles?.map((vehicle) => (
          <DropdownMenuItem
            key={vehicle.id}
            onClick={() => {
              setActiveVehicleId(vehicle.id);
            }}
            className="flex items-center gap-2"
          >
            <Check
              className={`h-4 w-4 shrink-0 ${vehicle.id === activeVehicleId ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden="true"
            />
            <span className="truncate">
              {vehicle.brand} {vehicle.model}
            </span>
          </DropdownMenuItem>
        ))}
        {vehicles && vehicles.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={() => {
            void navigate({ to: '/vehicles' });
          }}
          className="text-muted-foreground"
        >
          {t('manageVehicles')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void navigate({ to: '/vehicles/new' });
          }}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('addVehicle')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
