import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';

export interface RouterContext {
  queryClient: QueryClient;
}

function RootError({ error, reset }: { error: unknown; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <ErrorState
        message="Wystąpił błąd aplikacji"
        detail={error instanceof Error ? error.message : 'Nieznany błąd'}
        onRetry={reset}
        retryLabel="Spróbuj ponownie"
      />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <EmptyState
        title="404: Nie znaleziono"
        description="Nie mogliśmy znaleźć strony, której szukasz."
        action={
          <Link to="/">
            <Button>{'Wróć do strony głównej'}</Button>
          </Link>
        }
      />
    </div>
  );
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return <Outlet />;
}
