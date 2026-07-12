import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { type ComponentPropsWithoutRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BottomNav } from '@/components/layout/bottom-nav';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: ComponentPropsWithoutRef<'a'>) => <a {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/dashboard' }),
}));

vi.mock('@/features/vehicles/active-vehicle-context', () => ({
  useActiveVehicle: () => ({ activeVehicleId: 'veh-1', setActiveVehicleId: vi.fn() }),
}));

vi.mock('@/features/vehicles/queries', () => ({
  vehiclesQueryOptions: {
    queryKey: ['vehicles'],
    queryFn: vi
      .fn()
      .mockResolvedValue([{ id: 'veh-1', fuelType: 'petrol', brand: 'Audi', model: 'A4' }]),
    staleTime: Infinity,
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
queryClient.setQueryData(
  ['vehicles'],
  [{ id: 'veh-1', fuelType: 'petrol', brand: 'Audi', model: 'A4' }],
);

describe('BottomNav', () => {
  it('renders five mobile tabs without the More overflow action', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BottomNav />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText(/primary navigation/i)).toBeInTheDocument();
    expect(screen.queryByText(/^More$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Więcej$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
  });
});
