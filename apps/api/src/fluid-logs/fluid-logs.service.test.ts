import { type Db } from '@carnotea/db';
import { describe, expect, it, vi } from 'vitest';

import { FluidLogsService } from './fluid-logs.service.js';

const baseFluidLogRow = {
  id: 'fluid-log-id',
  vehicleId: 'vehicle-id',
  changeDate: '2026-01-15',
  mileage: 50000,
  fluidType: 'engine_oil',
  quantityLiters: '4.50',
  cost: '45.50',
  intervalKm: 10000,
  intervalMonths: 12,
  workshopName: null,
  notes: null,
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

function createInsertTx(insertedId = 'fluid-log-id') {
  const insertReturning = vi.fn().mockResolvedValue([{ id: insertedId }]);
  const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
  const insert = vi.fn().mockReturnValue({ values: insertValues });

  return { insert, insertValues, insertReturning };
}

function createUpdateTx() {
  const updateReturning = vi.fn().mockResolvedValue([{ id: 'fluid-log-id' }]);
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set: updateSet });

  return { update, updateSet, updateWhere, updateReturning };
}

function createDeleteTx() {
  const deleteReturning = vi.fn().mockResolvedValue([{ id: 'fluid-log-id' }]);
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

  const db = { select, transaction };

  const costSync = {
    upsertFromSource: vi.fn().mockResolvedValue(undefined),
    removeForSource: vi.fn().mockResolvedValue(undefined),
  };

  const service = new FluidLogsService(db as unknown as Db, costSync);

  return { service, db, costSync };
}

describe('FluidLogsService', () => {
  it('creates a fluid log and syncs an expense when cost is present', async () => {
    const tx = createInsertTx();
    const { service, db, costSync } = createServiceHarness({
      tx,
      selectRows: [[{ id: 'vehicle-id' }], [{ id: 1 }], [{ id: 'vehicle-id' }], [baseFluidLogRow]],
    });

    const created = await service.create('user-id', 'vehicle-id', {
      changeDate: '2026-01-15',
      mileage: 50000,
      fluidType: 'engine_oil',
      quantityLiters: 4.5,
      cost: 45.5,
    });

    expect(created).toMatchObject({ id: 'fluid-log-id', vehicleId: 'vehicle-id', cost: 45.5 });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.insert).toHaveBeenCalledOnce();
    expect(costSync.upsertFromSource).toHaveBeenCalledWith(tx, {
      vehicleId: 'vehicle-id',
      sourceType: 'fluid_log',
      sourceId: 'fluid-log-id',
      amount: 45.5,
      date: '2026-01-15',
      categoryCode: 'fluids',
    });
  });

  it('creates a fluid log without cost and does not sync an expense', async () => {
    const tx = createInsertTx();
    const noCostRow = { ...baseFluidLogRow, quantityLiters: null, cost: null };
    const { service, db, costSync } = createServiceHarness({
      tx,
      selectRows: [[{ id: 'vehicle-id' }], [{ id: 1 }], [{ id: 'vehicle-id' }], [noCostRow]],
    });

    const created = await service.create('user-id', 'vehicle-id', {
      changeDate: '2026-01-15',
      mileage: 50000,
      fluidType: 'coolant',
    });

    expect(created.cost).toBeNull();
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(costSync.upsertFromSource).not.toHaveBeenCalled();
  });

  it('computes nextDueMileage and nextDueDate from the interval fields', async () => {
    const tx = createInsertTx();
    const { service } = createServiceHarness({
      tx,
      selectRows: [[{ id: 'vehicle-id' }], [{ id: 1 }], [{ id: 'vehicle-id' }], [baseFluidLogRow]],
    });

    const created = await service.create('user-id', 'vehicle-id', {
      changeDate: '2026-01-15',
      mileage: 50000,
      fluidType: 'engine_oil',
      intervalKm: 10000,
      intervalMonths: 12,
    });

    expect(created.nextDueMileage).toBe(60000);
    expect(created.nextDueDate).toBe('2027-01-15');
  });

  it('returns null next-due fields when no interval is set', async () => {
    const tx = createInsertTx();
    const noIntervalRow = { ...baseFluidLogRow, intervalKm: null, intervalMonths: null };
    const { service } = createServiceHarness({
      tx,
      selectRows: [[{ id: 'vehicle-id' }], [{ id: 1 }], [{ id: 'vehicle-id' }], [noIntervalRow]],
    });

    const created = await service.create('user-id', 'vehicle-id', {
      changeDate: '2026-01-15',
      mileage: 50000,
      fluidType: 'engine_oil',
    });

    expect(created.nextDueMileage).toBeNull();
    expect(created.nextDueDate).toBeNull();
  });

  it('removes the synced expense when cost is cleared on update', async () => {
    const tx = createUpdateTx();
    const clearedCostRow = { ...baseFluidLogRow, cost: null };
    const { service, costSync } = createServiceHarness({
      tx,
      selectRows: [
        [{ id: 'vehicle-id' }],
        [{ ...baseFluidLogRow }],
        [{ id: 'vehicle-id' }],
        [clearedCostRow],
      ],
    });

    await service.update('user-id', 'vehicle-id', 'fluid-log-id', { cost: null });

    expect(tx.update).toHaveBeenCalledOnce();
    expect(costSync.removeForSource).toHaveBeenCalledWith(tx, {
      sourceType: 'fluid_log',
      sourceId: 'fluid-log-id',
    });
    expect(costSync.upsertFromSource).not.toHaveBeenCalled();
  });

  it('keeps syncing the existing cost when update does not touch it', async () => {
    const tx = createUpdateTx();
    const { service, costSync } = createServiceHarness({
      tx,
      selectRows: [
        [{ id: 'vehicle-id' }],
        [{ ...baseFluidLogRow }],
        [{ id: 'vehicle-id' }],
        [baseFluidLogRow],
      ],
    });

    await service.update('user-id', 'vehicle-id', 'fluid-log-id', { mileage: 51000 });

    expect(costSync.upsertFromSource).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ amount: 45.5, sourceType: 'fluid_log', sourceId: 'fluid-log-id' }),
    );
  });

  it('deletes the fluid log and removes any synced expense', async () => {
    const tx = createDeleteTx();
    const { service, db, costSync } = createServiceHarness({
      tx,
      selectRows: [[{ id: 'vehicle-id' }]],
    });

    await service.remove('user-id', 'vehicle-id', 'fluid-log-id');

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(tx.delete).toHaveBeenCalledOnce();
    expect(costSync.removeForSource).toHaveBeenCalledWith(tx, {
      sourceType: 'fluid_log',
      sourceId: 'fluid-log-id',
    });
  });
});
