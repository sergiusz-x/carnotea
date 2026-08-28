import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/components/ThemeProvider';

import { App } from './App';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#landing">{children}</a>,
  Navigate: () => null,
}));

vi.mock('@/features/auth/use-session', () => ({
  useSession: () => ({ data: null, isPending: false }),
}));

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
}

describe('App', () => {
  it('renders the public product landing for an anonymous visitor', () => {
    renderApp();

    expect(
      screen.getByRole('heading', { name: 'Everything important about your car. In one place.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Create an account' }).length).toBeGreaterThan(0);
  });

  it('renders account controls and a language switcher', () => {
    renderApp();

    expect(
      screen.getByRole('button', { name: /switch to (light|dark) mode/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /language/i })).toBeInTheDocument();
  });
});
