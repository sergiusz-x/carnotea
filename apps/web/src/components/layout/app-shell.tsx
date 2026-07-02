import { Link, Outlet } from '@tanstack/react-router';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppLogo } from '@/components/AppLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';

import { BottomNav } from './bottom-nav';
import { Fab } from './fab';
import { Nav } from './nav';
import { UserMenu } from './user-menu';
import { VehiclePicker } from './vehicle-picker';

export function AppShell() {
  const { t } = useTranslation('common');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top header — logo + utility actions only */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

      {/* Body: sidebar + content */}
      <div className="flex flex-1">
        {/* Left sidebar — desktop only */}
        <aside className="hidden w-60 shrink-0 border-r md:flex md:flex-col">
          <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col overflow-y-auto p-3">
            <VehiclePicker className="mb-1 h-9 w-full justify-start gap-2 px-3 text-sm" />
            <div className="my-2 border-t" />
            <Nav mobile />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile only */}
      <BottomNav />
      <Fab />
    </div>
  );
}
