import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ThemeProvider } from '@/components/ThemeProvider';

import { App } from './App';

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
}

describe('App', () => {
  it('renders the app name', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: 'CarNotea' })).toBeInTheDocument();
  });

  it('renders a theme toggle button', () => {
    renderApp();

    expect(
      screen.getByRole('button', { name: /switch to (light|dark) mode/i }),
    ).toBeInTheDocument();
  });
});
