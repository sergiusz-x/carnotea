import { type UserProfile, type UserProfileUpdate } from '@carnotea/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../../i18n';

import { ProfileScreen } from './profile-screen';

type ProfileResponse = { data: unknown; response: Response };

const apiClientMock = vi.hoisted(() => ({
  GET: vi.fn<() => Promise<ProfileResponse>>(),
  PATCH: vi.fn<(_path: string, body: UserProfileUpdate) => Promise<ProfileResponse>>(),
}));

vi.mock('@/features/gdpr/components/gdpr-section', () => ({
  GdprSection: () => null,
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: apiClientMock,
}));

const baseProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: 'jan@example.com',
  localePref: 'en',
  unitsPref: 'metric',
  currencyPref: 'PLN',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
} satisfies UserProfile;

function renderProfileScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileScreen />
    </QueryClientProvider>,
  );
}

describe('ProfileScreen', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('restores the saved profile language when profile data loads', async () => {
    apiClientMock.GET.mockResolvedValue({
      data: { ...baseProfile, localePref: 'pl' },
      response: new Response(),
    });

    renderProfileScreen();

    await screen.findByRole('heading', { name: 'Profil' });

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe('pl');
    });
    expect(localStorage.getItem('carnotea.lang')).toBe('pl');
  });

  it('normalizes legacy profile preference keys before resetting selects', async () => {
    apiClientMock.GET.mockResolvedValue({
      data: {
        id: baseProfile.id,
        firstName: baseProfile.firstName,
        lastName: baseProfile.lastName,
        email: baseProfile.email,
        locale_pref: 'pl',
        units_pref: 'metric',
        currency_pref: 'PLN',
        createdAt: baseProfile.createdAt,
        updatedAt: baseProfile.updatedAt,
      },
      response: new Response(),
    });

    renderProfileScreen();

    await screen.findByRole('heading', { name: 'Profil' });

    expect(screen.getByRole('combobox', { name: 'Język' })).toHaveTextContent('Polski');
    expect(screen.getByRole('combobox', { name: 'Jednostki' })).toHaveTextContent('Metryczne');
    expect(screen.getByRole('combobox', { name: 'Domyślna waluta' })).toHaveTextContent('PLN');
  });
  it('saves the selected language preference and switches language after success', async () => {
    let currentProfile: UserProfile = { ...baseProfile };
    apiClientMock.GET.mockImplementation(() =>
      Promise.resolve({
        data: currentProfile,
        response: new Response(),
      }),
    );
    apiClientMock.PATCH.mockImplementation((_path, body) => {
      currentProfile = { ...currentProfile, ...body };
      return Promise.resolve({
        data: currentProfile,
        response: new Response(),
      });
    });

    renderProfileScreen();

    await screen.findByRole('heading', { name: 'Profile' });

    fireEvent.click(screen.getByRole('combobox', { name: 'Language' }));
    fireEvent.click(screen.getByRole('option', { name: 'Polski' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() => {
      expect(apiClientMock.PATCH).toHaveBeenCalledWith('/api/me', {
        localePref: 'pl',
        unitsPref: 'metric',
        currencyPref: 'PLN',
      });
    });
    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe('pl');
    });
  });
});
