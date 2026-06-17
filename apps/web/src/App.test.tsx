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

  it('renders translated landing copy', () => {
    renderApp();

    expect(screen.getByText('Your personal vehicle diary.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument();
  });

  it('renders a language switcher', () => {
    renderApp();

    expect(screen.getByRole('combobox', { name: /language/i })).toBeInTheDocument();
  });
});
