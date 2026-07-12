import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/components/ThemeProvider';
import { authClient } from '@/lib/auth-client';
import { authenticatedLayoutRoute } from '@/routes/_authenticated';
import { dashboardRoute } from '@/routes/_authenticated/dashboard';
import { authenticatedIndexRoute } from '@/routes/_authenticated/index';
import { profileRoute } from '@/routes/_authenticated/profile';
import { vehiclesRoute } from '@/routes/_authenticated/vehicles';
import { loginRoute } from '@/routes/login';
import { rootRoute } from '@/routes/root';

vi.mock('@/components/Devtools', () => ({ Devtools: () => null }));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    getSession: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  },
}));

const mockSession = {
  user: { id: '1', name: 'Test User', email: 'test@example.com' },
  session: { id: 'sess1', userId: '1', token: 'tok' },
};

function buildRouter(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const routeTree = rootRoute.addChildren([
    authenticatedLayoutRoute.addChildren([
      authenticatedIndexRoute,
      vehiclesRoute,
      dashboardRoute,
      profileRoute,
    ]),
    loginRoute,
  ]);
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  return { queryClient, router };
}

function renderRouter(router: ReturnType<typeof buildRouter>['router'], queryClient: QueryClient) {
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auth guard', () => {
  it('redirects unauthenticated user from /vehicles to /login', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({ data: null, error: null });
    const { router, queryClient } = buildRouter('/vehicles');

    renderRouter(router, queryClient);

    await screen.findByRole('heading', { name: /sign in/i });
    expect(router.state.location.pathname).toBe('/login');
  });

  it('preserves the intended path as a redirect search param', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({ data: null, error: null });
    const { router, queryClient } = buildRouter('/vehicles');

    renderRouter(router, queryClient);

    await screen.findByRole('heading', { name: /sign in/i });
    expect(router.state.location.searchStr).toContain('redirect');
    expect(router.state.location.searchStr).toContain('vehicles');
  });

  it('allows an authenticated user to reach /vehicles', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({ data: mockSession, error: null });
    const { router, queryClient } = buildRouter('/vehicles');

    renderRouter(router, queryClient);

    await screen.findByText('CarNotea');
    expect(router.state.location.pathname).toBe('/vehicles');
  });

  it('redirects an authenticated user away from /login to /', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({ data: mockSession, error: null });
    const { router, queryClient } = buildRouter('/login');

    renderRouter(router, queryClient);

    await screen.findByText('CarNotea');
    expect(router.state.location.pathname).toBe('/');
  });

  it('shows a recoverable session state instead of the router error screen', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: null,
      error: { message: 'Session request failed' },
    });
    const { router, queryClient } = buildRouter('/vehicles');

    renderRouter(router, queryClient);

    await screen.findByText(/couldn't verify your session/i, undefined, { timeout: 5000 });
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/vehicles');
  });

  it('still renders the login screen when session bootstrap fails on /login', async () => {
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: null,
      error: { message: 'Session request failed' },
    });
    const { router, queryClient } = buildRouter('/login');

    renderRouter(router, queryClient);

    await screen.findByText(/couldn't verify your session/i, undefined, { timeout: 5000 });
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });
});

describe('sign-out', () => {
  it('calls signOut, then navigates to /login', async () => {
    vi.mocked(authClient.getSession)
      .mockResolvedValueOnce({ data: mockSession, error: null })
      .mockResolvedValue({ data: null, error: null });
    vi.mocked(authClient.signOut).mockResolvedValue(undefined);

    const { router, queryClient } = buildRouter('/vehicles');
    renderRouter(router, queryClient);

    const signOutButton = await screen.findByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
    expect(authClient.signOut).toHaveBeenCalledOnce();
  });
});
