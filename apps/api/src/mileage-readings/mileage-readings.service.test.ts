import { describe, expect, it, vi } from 'vitest';

import { MileageSyncService, type DbTx } from '../mileage/mileage-sync.service.js';

import { MileageReadingsService } from './mileage-readings.service.js';

// The MileageSyncService is stateless (tx-first) so we test its interface contract here.

describe('MileageSyncService interface', () => {
  it('has the expected tx-first methods', () => {
    const svc = new MileageSyncService();
    expect(typeof svc.syncDerivedReading).toBe('function');
    expect(typeof svc.removeDerivedReading).toBe('function');
    expect(typeof svc.recomputeCurrentMileage).toBe('function');
  });

  it('uses the caller transaction without opening a nested transaction', async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const insertValues = vi.fn().mockReturnValue({ onConflictDoUpdate });
    const insert = vi.fn().mockReturnValue({ values: insertValues });
    const select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ maxMileage: 1234 }]),
      }),
    });
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const nestedTransaction = vi.fn();
    const tx = {
      insert,
      select,
      update,
      transaction: nestedTransaction,
    };
    const svc = new MileageSyncService();

    await svc.syncDerivedReading(tx as unknown as DbTx, {
      vehicleId: 'vehicle-id',
      sourceType: 'fuel_log',
      sourceId: 'fuel-log-id',
      mileage: 1234,
      date: '2026-01-15',
    });

    expect(insert).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(nestedTransaction).not.toHaveBeenCalled();
  });
});

describe('MileageReadingsService — sourceType enforcement', () => {
  it('forces sourceType=manual and sourceId=null regardless of input', async () => {
    const insertedRow = {
      id: 'row-id',
      vehicleId: 'vehicle-id',
      readingDate: '2026-01-01',
      mileage: 1000,
      sourceType: 'manual',
      sourceId: null,
      note: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };

    const insertReturning = vi.fn().mockResolvedValue([insertedRow]);
    const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
    const txInsert = vi.fn().mockReturnValue({ values: insertValues });
    const txUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    const txSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ maxMileage: 1000 }]),
      }),
    });

    const fakeTx = { insert: txInsert, select: txSelect, update: txUpdate };
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: 'vehicle-id' }]) }),
        }),
      }),
      transaction: vi
        .fn()
        .mockImplementation((cb: (tx: unknown) => Promise<unknown>) => cb(fakeTx)),
    };

    const fakeMileageSync = {
      recomputeCurrentMileage: vi.fn().mockResolvedValue(undefined),
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    const svc = new MileageReadingsService(fakeDb as any, fakeMileageSync as any);

    await svc.create('user-id', 'vehicle-id', { readingDate: '2026-01-01', mileage: 1000 });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const valuesCall = insertValues.mock.calls[0]?.[0];
    expect(valuesCall).toMatchObject({ sourceType: 'manual', sourceId: null });
    expect(fakeMileageSync.recomputeCurrentMileage).toHaveBeenCalledOnce();
  });
});
