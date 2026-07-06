import { type ChargingSession, type Vehicle } from '@carnotea/shared';

type FuelType = Vehicle['fuelType'];

interface MileageLike {
  mileage: number;
}

type ChargingMetricSession = Pick<
  ChargingSession,
  'chargeDate' | 'mileage' | 'energyKwh' | 'totalCost'
>;

export function isElectricVehicle(fuelType: FuelType | null | undefined): boolean {
  return fuelType === 'electric';
}

export function supportsFuelLogs(fuelType: FuelType | null | undefined): boolean {
  return fuelType !== 'electric';
}

export function supportsCharging(fuelType: FuelType | null | undefined): boolean {
  return fuelType === 'electric' || fuelType === 'hybrid';
}

export function resolveLatestMileage(
  currentMileage: number | null | undefined,
  readings: readonly MileageLike[] | null | undefined,
): number | undefined {
  const readingMax =
    readings && readings.length > 0
      ? Math.max(...readings.map((reading) => reading.mileage))
      : null;

  if (currentMileage == null) return readingMax ?? undefined;
  if (readingMax == null) return currentMileage;
  return Math.max(currentMileage, readingMax);
}

const PRESERVED_PANELS: Partial<
  Record<string, (fuelType: FuelType | null | undefined) => boolean>
> = {
  fuel: supportsFuelLogs,
  charging: supportsCharging,
  service: () => true,
  issues: () => true,
  expenses: () => true,
  reminders: () => true,
};

export function resolveVehicleSwitchPath(
  currentPathname: string,
  newVehicleId: string,
  newVehicleFuelType: FuelType | null | undefined,
): string {
  const panel = /^\/vehicles\/[^/]+\/([^/]+)/.exec(currentPathname)?.[1];
  const supportsPanel = panel != null ? PRESERVED_PANELS[panel] : undefined;

  if (panel == null || !supportsPanel || !supportsPanel(newVehicleFuelType)) {
    return `/vehicles/${newVehicleId}`;
  }

  return `/vehicles/${newVehicleId}/${panel}`;
}

export function calculateChargingMetrics(
  sessions: readonly ChargingMetricSession[] | null | undefined,
): {
  totalChargingCost: number;
  avgEnergyConsumption: number | null;
} {
  if (!sessions || sessions.length === 0) {
    return { totalChargingCost: 0, avgEnergyConsumption: null };
  }

  const sortedSessions = [...sessions].sort((left, right) => {
    if (left.chargeDate !== right.chargeDate) {
      return left.chargeDate.localeCompare(right.chargeDate);
    }

    return left.mileage - right.mileage;
  });

  let totalChargingCost = 0;
  let totalEnergyKwh = 0;
  let totalMileageDelta = 0;

  for (const [index, session] of sortedSessions.entries()) {
    totalChargingCost += session.totalCost;

    if (index === 0) continue;

    const previousSession = sortedSessions[index - 1];
    if (!previousSession) continue;

    const mileageDelta = session.mileage - previousSession.mileage;
    if (mileageDelta <= 0) continue;

    totalMileageDelta += mileageDelta;
    totalEnergyKwh += session.energyKwh;
  }

  return {
    totalChargingCost,
    avgEnergyConsumption: totalMileageDelta > 0 ? (totalEnergyKwh / totalMileageDelta) * 100 : null,
  };
}
