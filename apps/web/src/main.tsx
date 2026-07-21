import './otel';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { get, set, del } from 'idb-keyval';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@/components/ThemeProvider';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/lib/router';
import { registerSyncRunner } from '@/offline';

import './i18n';
import './styles/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => await get(key),
    setItem: async (key, value) => { await set(key, value); },
    removeItem: async (key) => { await del(key); },
  },
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

registerSyncRunner();

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
