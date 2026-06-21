import { createRoute, redirect, useSearch } from '@tanstack/react-router';
import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SignInForm } from '@/features/auth/sign-in-form';
import { SignUpForm } from '@/features/auth/sign-up-form';
import { sessionQueryOptions } from '@/features/auth/use-session';

import { rootRoute } from './root';

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (session?.user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: search.redirect ?? '/' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation('common');
  const { theme, toggleTheme } = useTheme();
  const search = useSearch({ from: '/login' });
  const redirectTo = search.redirect;
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <Button
          variant="outline"
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
      </div>

      <div className="mb-6 text-center">
        <span className="text-3xl font-bold">{t('appName')}</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          {mode === 'signIn' ? (
            <SignInForm
              redirectTo={redirectTo}
              onSwitchToSignUp={() => {
                setMode('signUp');
              }}
            />
          ) : (
            <SignUpForm
              redirectTo={redirectTo}
              onSwitchToSignIn={() => {
                setMode('signIn');
              }}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
