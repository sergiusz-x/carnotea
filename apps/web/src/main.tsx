import './otel';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@/components/ThemeProvider';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/lib/router';

import './i18n';
import './styles/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

// eslint-disable-next-line @typescript-eslint/no-deprecated
const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

const persistOptions = {
  persister,
  dehydrateOptions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shouldDehydrateQuery: (query: any) => {
      // Zabezpieczenie przed zapisem wrażliwych danych lokalnie (T-14)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (['session', 'profile'].includes(query.queryKey[0] as string)) {
        return false;
      }
      return true;
    },
  },
};

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
