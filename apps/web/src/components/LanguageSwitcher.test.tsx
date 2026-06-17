import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import i18n from '../i18n';

import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
    localStorage.clear();
  });

  it('renders an option for each supported language', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole('combobox', { name: /language/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Polski' })).toBeInTheDocument();
  });

  it('changes the active language and persists the choice to localStorage', async () => {
    render(<LanguageSwitcher />);
    const select = screen.getByRole('combobox', { name: /language/i });

    fireEvent.change(select, { target: { value: 'pl' } });

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe('pl');
    });
    expect(localStorage.getItem('carnotea.lang')).toBe('pl');
  });
});
