import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { vehiclesQueryOptions } from './queries';

const STORAGE_KEY = 'carnotea.activeVehicleId';

interface ActiveVehicleContextValue {
  activeVehicleId: string | null;
  setActiveVehicleId: (id: string | null) => void;
}

const ActiveVehicleContext = createContext<ActiveVehicleContextValue | null>(null);

export function ActiveVehicleProvider({ children }: { children: ReactNode }) {
  const [activeVehicleId, setActiveVehicleIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );

  const { data: vehicles } = useQuery(vehiclesQueryOptions);

  // Auto-select when only one vehicle exists and nothing is saved.
  // React allows calling setState during render for derived-state updates —
  // the component re-renders immediately in the same frame, no extra cycle.
  let resolvedId = activeVehicleId;

  if (vehicles) {
    if (activeVehicleId === null && vehicles.length > 0 && vehicles[0]) {
      resolvedId = vehicles[0].id;
      setActiveVehicleIdState(resolvedId);
      localStorage.setItem(STORAGE_KEY, resolvedId);
    } else if (activeVehicleId !== null && !vehicles.find((v) => v.id === activeVehicleId)) {
      // Saved vehicle was deleted — clear the stale id.
      resolvedId = null;
      setActiveVehicleIdState(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function setActiveVehicleId(id: string | null) {
    setActiveVehicleIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <ActiveVehicleContext.Provider value={{ activeVehicleId: resolvedId, setActiveVehicleId }}>
      {children}
    </ActiveVehicleContext.Provider>
  );
}

export function useActiveVehicle(): ActiveVehicleContextValue {
  const ctx = useContext(ActiveVehicleContext);
  if (!ctx) throw new Error('useActiveVehicle must be used inside ActiveVehicleProvider');
  return ctx;
}
