import { Navigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/use-session';
import { LandingPage } from '@/features/landing/components/landing-page';

export function App() {
  const { t } = useTranslation('landing');
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-4 text-sm text-muted-foreground">
        {t('session.loading')}
      </main>
    );
  }

  if (session?.user) return <Navigate to="/dashboard" replace />;

  return <LandingPage />;
}
