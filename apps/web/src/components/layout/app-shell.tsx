import { Outlet } from '@tanstack/react-router';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';

import { Nav } from './nav';
import { UserMenu } from './user-menu';

export function AppShell() {
  const { t } = useTranslation('common');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold tracking-tight">{t('appName')}</span>
            <Nav />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
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
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
