import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { rootRoute } from '@/routes/root';

import { healthRoute } from './routes';

// The root layout renders dev-only devtools via lazy dynamic imports; stub them
// so the route renders synchronously under jsdom.
vi.mock('@/components/Devtools', () => ({ Devtools: () => null }));

function renderHealthRoute() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const routeTree = rootRoute.addChildren([healthRoute]);
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: ['/healthz'] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('/healthz route', () => {
  it('renders "OK" when the API is healthy', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    renderHealthRoute();

    expect(await screen.findByText('OK')).toBeInTheDocument();
  });

  it('renders "down" through the route (not the router error boundary) when the API is down', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }));

    renderHealthRoute();

    expect(await screen.findByText('down')).toBeInTheDocument();
  });
});
