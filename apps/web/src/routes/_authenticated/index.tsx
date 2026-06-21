import { createRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { authenticatedLayoutRoute } from '../_authenticated';

export const authenticatedIndexRoute = createRoute({
  getParentRoute: () => authenticatedLayoutRoute,
  path: '/',
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation('nav');
  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
    </div>
  );
}
