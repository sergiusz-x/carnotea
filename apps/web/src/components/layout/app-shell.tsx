import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppLogo } from '@/components/AppLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';

import { Nav } from './nav';
import { UserMenu } from './user-menu';

export function AppShell() {
  const { t } = useTranslation('common');
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const [menuPathname, setMenuPathname] = useState(pathname);

  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4">
          {/* Brand + desktop nav */}
          <div className="flex items-center gap-8">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <AppLogo />
              <span className="text-lg font-bold tracking-tight">{t('appName')}</span>
            </Link>
            <div className="hidden md:block">
              <Nav />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
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
            <div className="hidden md:flex">
              <UserMenu />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => {
                setMobileOpen((prev) => !prev);
              }}
              aria-label={mobileOpen ? t('nav.close') : t('nav.open')}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div id="mobile-menu" className="border-t bg-background md:hidden">
            <div className="container mx-auto max-w-screen-xl px-4 py-3">
              <Nav
                mobile
                onNavigate={() => {
                  setMobileOpen(false);
                }}
              />
              <div className="mt-3 flex items-center gap-3 border-t pt-3">
                <div className="sm:hidden">
                  <LanguageSwitcher />
                </div>
                <div className="ml-auto">
                  <UserMenu />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
