import { type Db } from '@carnotea/db';
import { describe, expect, it, vi } from 'vitest';

import { type MileageSyncService } from '../mileage/mileage-sync.service.js';

import { computeConsumptionHint, computeTotalCost, FuelLogsService } from './fuel-logs.service.js';

const baseFuelLogRow = {
  id: 'fuel-log-id',
  vehicleId: 'vehicle-id',
  fuelDate: '2026-01-15',
  mileage: 10_000,
  liters: '40',
  pricePerLiter: '1.8',
  totalCost: '72',
  stationName: null,
  description: null,
  isFullTank: false,
  createdAt: new Date('2026-01-15T00:00:00Z'),
};

function selectResult(rows: unknown[]) {
  const terminal = { limit: vi.fn().mockResolvedValue(rows) };
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(terminal),
      innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue(terminal) }),
    }),
  };
}

function createInsertTx(insertedId = 'fuel-log-id') {
  const insertReturning = vi.fn().mockResolvedValue([{ id: insertedId }]);
  const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
  const insert = vi.fn().mockReturnValue({ values: insertValues });

  return { insert, insertValues, insertReturning };
}

function createUpdateTx() {
  const updateReturning = vi.fn().mockResolvedValue([{ id: 'fuel-log-id' }]);
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set: updateSet });

  return { update, updateSet, updateWhere, updateReturning };
}

function createDeleteTx() {
  const deleteReturning = vi.fn().mockResolvedValue([{ id: 'fuel-log-id' }]);
  const deleteWhere = vi.fn().mockReturnValue({ returning: deleteReturning });
  const remove = vi.fn().mockReturnValue({ where: deleteWhere });

  return { delete: remove, deleteWhere, deleteReturning };
}

function createServiceHarness(params: {
  tx: object;
  selectRows: unknown[][];
  transaction?: (callback: (tx: object) => Promise<unknown>) => Promise<unknown>;
}) {
  const selectRows = [...params.selectRows];
  const select = vi.fn(() => selectResult(selectRows.shift() ?? []));
  const transaction = vi.fn(
    params.transaction ??
      ((callback: (tx: object) => Promise<unknown>) => {
        return callback(params.tx);
      }),
  );

  const db = {
    select,
    transaction,
  };

  const mileageSync = {
    syncDerivedReading: vi.fn().mockResolvedValue(undefined),
    removeDerivedReading: vi.fn().mockResolvedValue(undefined),
  };

  const costSync = {
    upsertFromSource: vi.fn().mockResolvedValue(undefined),
    removeForSource: vi.fn().mockResolvedValue(undefined),
  };

  const service = new FuelLogsService(
    db as unknown as Db,
    mileageSync as unknown as MileageSyncService,
    costSync,
  );

  return { service, db, mileageSync, costSync };
}

describe('computeTotalCost', () => {
  it('rounds to 2 decimal places', () => {
    expect(computeTotalCost(40, 1.8)).toBe(72);
    expect(computeTotalCost(33.5, 1.739)).toBe(58.26);
    expect(computeTotalCost(41.23, 1.699)).toBe(70.05);
  });

  it('matches the DB formula round(liters * pricePerLiter, 2)', () => {
    // 50 * 1.234 = 61.7 → rounds to 61.70
    expect(computeTotalCost(50, 1.234)).toBe(61.7);
    // 10 * 1.005 = 10.05
    expect(computeTotalCost(10, 1.005)).toBe(10.05);
  });
});

describe('computeConsumptionHint', () => {
  it('returns null when current refuel is not full-tank', () => {
    expect(computeConsumptionHint(40, 50000, false, 49000)).toBeNull();
  });

  it('returns null when there is no previous full-tank refuel', () => {
    expect(computeConsumptionHint(40, 50000, true, null)).toBeNull();
  });

  it('returns null when mileage difference is zero or negative', () => {
    expect(computeConsumptionHint(40, 50000, true, 50000)).toBeNull();
    expect(computeConsumptionHint(40, 50000, true, 50001)).toBeNull();
  });

  it('computes L/100km correctly between two full-tank refuels', () => {
    // 40L over 500km → 8.0 L/100km
    expect(computeConsumptionHint(40, 50500, true, 50000)).toBe(8);
  });

  it('rounds the hint to 2 decimal places', () => {
    // 41L over 520km → 41/520*100 = 7.884615... → 7.88
    expect(computeConsumptionHint(41, 50520, true, 50000)).toBe(7.88);
  });

  it('returns null for partial fill even with a previous full-tank', () => {
    expect(computeConsumptionHint(20, 50200, false, 50000)).toBeNull();
  });
});

describe('FuelLogsService derived sync transactions', () => {
  it('creates the source row and derived rows with the same transaction handle', async () => {
    const tx = createInsertTx();
    const { service, db, mileageSync, costSync } = createServiceHarness({
      tx,
      selectRows: [
        [{ id: 'vehicle-id' }],
        [{ fuelType: 'petrol' }],
        [{ id: 'vehicle-id' }],
        [baseFuelLogRow],
      ],
    });

    const created = await service.create('user-id', 'vehicle-id', {
      fuelDate: '2026-01-15',
      mileage: 10_000,
      liters: 40,
      pricePerLiter: 1.8,
      isFullTank: false,
    });

    expect(created).toMatchObject({
      id: 'fuel-log-id',
      vehicleId: 'vehicle-id',
      totalCost: 72,
    });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledOnce();
    expect(mileageSync.syncDerivedReading).toHaveBeenCalledWith(tx, {
      vehicleId: 'vehicle-id',
      sourceType: 'fuel_log',
      sourceId: 'fuel-log-id',
      mileage: 10_000,
      date: '2026-01-15',
    });
    expect(costSync.upsertFromSource).toHaveBeenCalledWith(tx, {
      vehicleId: 'vehicle-id',
      sourceType: 'fuel_log',
      sourceId: 'fuel-log-id',
      amount: 72,
      date: '2026-01-15',
      categoryCode: 'fuel',
    });
  });

  it('updates the source row and derived rows with the same transaction handle', async () => {
    const tx = createUpdateTx();
    const updatedRow = { ...baseFuelLogRow, mileage: 10_500, totalCost: '90' };
    const { service, db, mileageSync, costSync } = createServiceHarness({
      tx,
      selectRows: [[{ id: 'vehicle-id' }], [baseFuelLogRow], [{ id: 'vehicle-id' }], [updatedRow]],
    });

    await service.update('user-id', 'vehicle-id', 'fuel-log-id', {
      mileage: 10_500,
      liters: 45,
      pricePerLiter: 2,
    });

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.update).toHaveBeenCalledOnce();
    expect(mileageSync.syncDerivedReading).toHaveBeenCalledWith(tx, {
      vehicleId: 'vehicle-id',
      sourceType: 'fuel_log',
      sourceId: 'fuel-log-id',
      mileage: 10_500,
      date: '2026-01-15',
    });
    expect(costSync.upsertFromSource).toHaveBeenCalledWith(tx, {
      vehicleId: 'vehicle-id',
      sourceType: 'fuel_log',
      sourceId: 'fuel-log-id',
      amount: 90,
      date: '2026-01-15',
      categoryCode: 'fuel',
    });
  });

  it('deletes the source row and derived rows with the same transaction handle', async () => {
    const tx = createDeleteTx();
    const { service, db, mileageSync, costSync } = createServiceHarness({
      tx,
      selectRows: [[{ id: 'vehicle-id' }]],
    });

    await service.remove('user-id', 'vehicle-id', 'fuel-log-id');

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.delete).toHaveBeenCalledOnce();
    expect(mileageSync.removeDerivedReading).toHaveBeenCalledWith(tx, {
      vehicleId: 'vehicle-id',
      sourceType: 'fuel_log',
      sourceId: 'fuel-log-id',
    });
    expect(costSync.removeForSource).toHaveBeenCalledWith(tx, {
      sourceType: 'fuel_log',
      sourceId: 'fuel-log-id',
    });
  });

  it('propagates mileage sync failures from inside the transaction', async () => {
    const tx = createInsertTx();
    const syncError = new Error('sync failed');
    let transactionRolledBack = false;
    const { service, db, mileageSync, costSync } = createServiceHarness({
      tx,
      selectRows: [[{ id: 'vehicle-id' }], [{ fuelType: 'petrol' }]],
      transaction: async (callback) => {
        try {
          return await callback(tx);
        } catch (error) {
          transactionRolledBack = true;
          throw error;
        }
      },
    });
    mileageSync.syncDerivedReading.mockRejectedValue(syncError);

    await expect(
      service.create('user-id', 'vehicle-id', {
        fuelDate: '2026-01-15',
        mileage: 10_000,
        liters: 40,
        pricePerLiter: 1.8,
        isFullTank: false,
      }),
    ).rejects.toThrow(syncError);

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledOnce();
    expect(transactionRolledBack).toBe(true);
    expect(costSync.upsertFromSource).not.toHaveBeenCalled();
  });
});
