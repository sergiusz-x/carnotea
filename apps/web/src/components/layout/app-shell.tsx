import { useQuery } from '@tanstack/react-query';
import { Link, Outlet } from '@tanstack/react-router';
import { Car, ChevronDown, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppLogo } from '@/components/AppLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { useActiveVehicle } from '@/features/vehicles/active-vehicle-context';
import { vehiclesQueryOptions } from '@/features/vehicles/queries';

import { BottomNav } from './bottom-nav';
import { Fab } from './fab';
import { Nav } from './nav';
import { UserMenu } from './user-menu';
import { VehiclePicker } from './vehicle-picker';
import { VehiclePickerSheet } from './vehicle-picker-sheet';

export function AppShell() {
  const { t } = useTranslation('common');
  const { t: tNav } = useTranslation('nav');
  const { theme, toggleTheme } = useTheme();
  const { activeVehicleId } = useActiveVehicle();
  const { data: vehicles } = useQuery(vehiclesQueryOptions);
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);

  const activeVehicle = vehicles?.find((v) => v.id === activeVehicleId);
  const vehicleLabel = activeVehicle
    ? `${activeVehicle.brand} ${activeVehicle.model}`
    : tNav('selectVehicle');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-16 items-center gap-4 px-4">
          <Link
            to="/dashboard"
            className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <AppLogo />
            <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">
              {t('appName')}
            </span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setVehicleSheetOpen(true);
            }}
            aria-label={vehicleLabel}
            className="flex max-w-[160px] items-center gap-1.5 truncate md:hidden"
          >
            <Car className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate text-sm">{vehicleLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r md:flex md:flex-col">
          <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col overflow-y-auto p-3">
            <VehiclePicker className="mb-1 h-9 w-full justify-start gap-2 px-3 text-sm" />
            <div className="my-2 border-t" />
            <Nav mobile />
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <Fab />
      <VehiclePickerSheet open={vehicleSheetOpen} onOpenChange={setVehicleSheetOpen} />
    </div>
  );
}
