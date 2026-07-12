import {
  chargerTypes,
  chargingSessions,
  expenseCategories,
  expenses,
  fluidLogs,
  fluidTypes,
  fuelLogs,
  fuelTypes,
  issuePriorities,
  issueStatuses,
  issues,
  reminderStatuses,
  reminders,
  serviceParts,
  serviceRecords,
  vehicles,
  type Db,
} from '@carnotea/db';
import {
  type ActivityEntry,
  type ActivityFeedResponse,
  type ActivityQuery,
  type ChargerTypeCode,
  type ExpenseCategoryCode,
  type FluidTypeCode,
  type VehiclePanel,
} from '@carnotea/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, lt, lte, sql } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';
import { compareReminderUrgency, computeReminderUrgency } from '../reminders/reminder-urgency.js';

interface Cursor {
  occurredAt: string;
  id: string;
}

function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.occurredAt}|${c.id}`).toString('base64url');
}

function decodeCursor(raw: string): Cursor | null {
  try {
    const [occurredAt, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
    if (!occurredAt || !id) return null;
    return { occurredAt, id };
  } catch {
    return null;
  }
}

function compareDesc(a: ActivityEntry, b: ActivityEntry): number {
  if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

function isAfter(e: ActivityEntry, cur: Cursor): boolean {
  if (e.occurredAt !== cur.occurredAt) return e.occurredAt < cur.occurredAt;
  return e.id < cur.id;
}

@Injectable()
export class ActivityService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getActivity(
    userId: string,
    vehicleId: string,
    query: ActivityQuery,
  ): Promise<ActivityFeedResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const take = query.limit + 1;

    const entries = (
      await Promise.all([
        this.fuelEntries(vehicleId, cursor, take),
        this.chargeEntries(vehicleId, cursor, take),
        this.fluidEntries(vehicleId, cursor, take),
        this.serviceEntries(vehicleId, cursor, take),
        this.expenseEntries(vehicleId, cursor, take),
        this.issueEntries(vehicleId, cursor, take),
        this.reminderEntries(vehicleId, cursor, take),
      ])
    ).flat();

    const page = entries.filter((e) => (cursor ? isAfter(e, cursor) : true)).sort(compareDesc);
    const hasMore = page.length > query.limit;
    const items = page.slice(0, query.limit);
    const last = items.at(-1);

    return {
      items,
      nextCursor:
        hasMore && last ? encodeCursor({ occurredAt: last.occurredAt, id: last.id }) : null,
    };
  }

  private async fuelEntries(
    vehicleId: string,
    cursor: Cursor | null,
    take: number,
  ): Promise<ActivityEntry[]> {
    const rows = await this.db
      .select({
        id: fuelLogs.id,
        vehicleId: fuelLogs.vehicleId,
        occurredAt: fuelLogs.fuelDate,
        mileage: fuelLogs.mileage,
        liters: fuelLogs.liters,
        totalCost: fuelLogs.totalCost,
        isFullTank: fuelLogs.isFullTank,
        stationName: fuelLogs.stationName,
      })
      .from(fuelLogs)
      .where(
        cursor
          ? and(eq(fuelLogs.vehicleId, vehicleId), lte(fuelLogs.fuelDate, cursor.occurredAt))
          : eq(fuelLogs.vehicleId, vehicleId),
      )
      .orderBy(desc(fuelLogs.fuelDate), desc(fuelLogs.id))
      .limit(take);

    return rows.map((r) => ({
      kind: 'fuel',
      id: r.id,
      vehicleId: r.vehicleId,
      occurredAt: r.occurredAt,
      mileage: r.mileage,
      liters: Number(r.liters),
      totalCost: Number(r.totalCost),
      isFullTank: r.isFullTank,
      stationName: r.stationName,
    }));
  }

  private async chargeEntries(
    vehicleId: string,
    cursor: Cursor | null,
    take: number,
  ): Promise<ActivityEntry[]> {
    const rows = await this.db
      .select({
        id: chargingSessions.id,
        vehicleId: chargingSessions.vehicleId,
        occurredAt: chargingSessions.chargeDate,
        mileage: chargingSessions.mileage,
        energyKwh: chargingSessions.energyKwh,
        totalCost: chargingSessions.totalCost,
        chargerType: chargerTypes.code,
        isFullCharge: chargingSessions.isFullCharge,
        stationName: chargingSessions.stationName,
        socStartPercent: chargingSessions.socStartPercent,
        socEndPercent: chargingSessions.socEndPercent,
      })
      .from(chargingSessions)
      .innerJoin(chargerTypes, eq(chargingSessions.chargerTypeId, chargerTypes.id))
      .where(
        cursor
          ? and(
              eq(chargingSessions.vehicleId, vehicleId),
              lte(chargingSessions.chargeDate, cursor.occurredAt),
            )
          : eq(chargingSessions.vehicleId, vehicleId),
      )
      .orderBy(desc(chargingSessions.chargeDate), desc(chargingSessions.id))
      .limit(take);

    return rows.map((r) => ({
      kind: 'charge',
      id: r.id,
      vehicleId: r.vehicleId,
      occurredAt: r.occurredAt,
      mileage: r.mileage,
      energyKwh: Number(r.energyKwh),
      totalCost: Number(r.totalCost),
      chargerType: r.chargerType as ChargerTypeCode,
      isFullCharge: r.isFullCharge,
      stationName: r.stationName,
      socStartPercent: r.socStartPercent,
      socEndPercent: r.socEndPercent,
    }));
  }

  private async fluidEntries(
    vehicleId: string,
    cursor: Cursor | null,
    take: number,
  ): Promise<ActivityEntry[]> {
    const rows = await this.db
      .select({
        id: fluidLogs.id,
        vehicleId: fluidLogs.vehicleId,
        occurredAt: fluidLogs.changeDate,
        mileage: fluidLogs.mileage,
        fluidType: fluidTypes.code,
        quantityLiters: fluidLogs.quantityLiters,
        cost: fluidLogs.cost,
        workshopName: fluidLogs.workshopName,
      })
      .from(fluidLogs)
      .innerJoin(fluidTypes, eq(fluidLogs.fluidTypeId, fluidTypes.id))
      .where(
        cursor
          ? and(eq(fluidLogs.vehicleId, vehicleId), lte(fluidLogs.changeDate, cursor.occurredAt))
          : eq(fluidLogs.vehicleId, vehicleId),
      )
      .orderBy(desc(fluidLogs.changeDate), desc(fluidLogs.id))
      .limit(take);

    return rows.map((r) => ({
      kind: 'fluid',
      id: r.id,
      vehicleId: r.vehicleId,
      occurredAt: r.occurredAt,
      mileage: r.mileage,
      fluidType: r.fluidType as FluidTypeCode,
      quantityLiters: r.quantityLiters != null ? Number(r.quantityLiters) : null,
      cost: r.cost != null ? Number(r.cost) : null,
      workshopName: r.workshopName,
    }));
  }

  private async serviceEntries(
    vehicleId: string,
    cursor: Cursor | null,
    take: number,
  ): Promise<ActivityEntry[]> {
    const rows = await this.db
      .select({
        id: serviceRecords.id,
        vehicleId: serviceRecords.vehicleId,
        occurredAt: serviceRecords.serviceDate,
        mileage: serviceRecords.mileage,
        title: serviceRecords.title,
        totalCost: serviceRecords.totalCost,
        workshopName: serviceRecords.workshopName,
        partCount: count(serviceParts.id),
      })
      .from(serviceRecords)
      .leftJoin(serviceParts, eq(serviceParts.serviceRecordId, serviceRecords.id))
      .where(
        cursor
          ? and(
              eq(serviceRecords.vehicleId, vehicleId),
              lte(serviceRecords.serviceDate, cursor.occurredAt),
            )
          : eq(serviceRecords.vehicleId, vehicleId),
      )
      .groupBy(serviceRecords.id)
      .orderBy(desc(serviceRecords.serviceDate), desc(serviceRecords.id))
      .limit(take);

    return rows.map((r) => ({
      kind: 'service',
      id: r.id,
      vehicleId: r.vehicleId,
      occurredAt: r.occurredAt,
      mileage: r.mileage,
      title: r.title,
      totalCost: Number(r.totalCost),
      workshopName: r.workshopName,
      partCount: r.partCount,
    }));
  }

  private async expenseEntries(
    vehicleId: string,
    cursor: Cursor | null,
    take: number,
  ): Promise<ActivityEntry[]> {
    const rows = await this.db
      .select({
        id: expenses.id,
        vehicleId: expenses.vehicleId,
        occurredAt: expenses.expenseDate,
        category: expenseCategories.code,
        amount: expenses.amount,
        description: expenses.description,
        sourceType: expenses.sourceType,
      })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(
        cursor
          ? and(eq(expenses.vehicleId, vehicleId), lte(expenses.expenseDate, cursor.occurredAt))
          : eq(expenses.vehicleId, vehicleId),
      )
      .orderBy(desc(expenses.expenseDate), desc(expenses.id))
      .limit(take);

    return rows.map((r) => ({
      kind: 'expense',
      id: r.id,
      vehicleId: r.vehicleId,
      occurredAt: r.occurredAt,
      mileage: null,
      category: (r.category ?? 'other') as ExpenseCategoryCode,
      amount: Number(r.amount),
      description: r.description,
      isAutoSynced: r.sourceType !== 'manual',
    }));
  }

  private async issueEntries(
    vehicleId: string,
    cursor: Cursor | null,
    take: number,
  ): Promise<ActivityEntry[]> {
    const rows = await this.db
      .select({
        id: issues.id,
        vehicleId: issues.vehicleId,
        occurredAt: issues.reportedDate,
        title: issues.title,
        status: issueStatuses.code,
        priority: issuePriorities.code,
      })
      .from(issues)
      .innerJoin(issueStatuses, eq(issues.statusId, issueStatuses.id))
      .innerJoin(issuePriorities, eq(issues.priorityId, issuePriorities.id))
      .where(
        cursor
          ? and(eq(issues.vehicleId, vehicleId), lte(issues.reportedDate, cursor.occurredAt))
          : eq(issues.vehicleId, vehicleId),
      )
      .orderBy(desc(issues.reportedDate), desc(issues.id))
      .limit(take);

    return rows.map((r) => ({
      kind: 'issue',
      id: r.id,
      vehicleId: r.vehicleId,
      occurredAt: r.occurredAt,
      mileage: null,
      title: r.title,
      status: r.status as 'open' | 'in_progress' | 'resolved' | 'cancelled',
      priority: r.priority as 'low' | 'medium' | 'high' | 'critical',
    }));
  }

  private async reminderEntries(
    vehicleId: string,
    cursor: Cursor | null,
    take: number,
  ): Promise<ActivityEntry[]> {
    const rows = await this.db
      .select({
        id: reminders.id,
        vehicleId: reminders.vehicleId,
        occurredAt: sql<string>`(${reminders.createdAt} at time zone 'UTC')::date::text`,
        title: reminders.title,
        mode: reminders.mode,
        dueDate: reminders.dueDate,
        dueMileage: reminders.dueMileage,
        intervalKm: reminders.intervalKm,
        intervalMonths: reminders.intervalMonths,
        lastPerformedDate: reminders.lastPerformedDate,
        lastPerformedMileage: reminders.lastPerformedMileage,
        status: reminderStatuses.code,
        currentMileage: vehicles.currentMileage,
      })
      .from(reminders)
      .innerJoin(reminderStatuses, eq(reminders.statusId, reminderStatuses.id))
      .innerJoin(vehicles, eq(reminders.vehicleId, vehicles.id))
      .where(
        cursor
          ? and(
              eq(reminders.vehicleId, vehicleId),
              lte(sql`(${reminders.createdAt} at time zone 'UTC')::date`, cursor.occurredAt),
            )
          : eq(reminders.vehicleId, vehicleId),
      )
      .orderBy(desc(sql`(${reminders.createdAt} at time zone 'UTC')::date`), desc(reminders.id))
      .limit(take);

    return rows.map((r) => {
      const urgency = computeReminderUrgency({
        mode: r.mode as 'one_off' | 'recurring',
        dueDate: r.dueDate,
        dueMileage: r.dueMileage,
        intervalKm: r.intervalKm,
        intervalMonths: r.intervalMonths,
        lastPerformedDate: r.lastPerformedDate,
        lastPerformedMileage: r.lastPerformedMileage,
        currentMileage: r.currentMileage,
        status: r.status,
      });

      return {
        kind: 'reminder',
        id: r.id,
        vehicleId: r.vehicleId,
        occurredAt: r.occurredAt,
        mileage: null,
        title: r.title,
        mode: r.mode as 'one_off' | 'recurring',
        status: r.status as 'pending' | 'done' | 'cancelled',
        dueState: urgency.dueState,
        dueDate: r.dueDate,
        dueMileage: r.dueMileage,
        intervalKm: r.intervalKm,
        intervalMonths: r.intervalMonths,
        lastPerformedDate: r.lastPerformedDate,
        lastPerformedMileage: r.lastPerformedMileage,
        nextDueDate: urgency.nextDueDate,
        nextDueMileage: urgency.nextDueMileage,
      };
    });
  }

  async getPanel(userId: string, vehicleId: string): Promise<VehiclePanel> {
    const vehicleRows = await this.db
      .select({
        id: vehicles.id,
        brand: vehicles.brand,
        model: vehicles.model,
        productionYear: vehicles.productionYear,
        fuelType: fuelTypes.code,
        currentMileage: vehicles.currentMileage,
        currencyCode: vehicles.currencyCode,
      })
      .from(vehicles)
      .innerJoin(fuelTypes, eq(vehicles.fuelTypeId, fuelTypes.id))
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);

    const vehicle = vehicleRows.at(0);
    if (!vehicle) throw this.notFound();

    const [energy, nextService, monthCost, avgConsumption] = await Promise.all([
      this.energyVital(vehicleId, vehicle.fuelType),
      this.nextServiceVital(vehicleId, vehicle.currentMileage),
      this.monthCostVital(vehicleId, vehicle.currencyCode),
      this.avgConsumptionVital(vehicleId, vehicle.fuelType),
    ]);

    return {
      vehicleId: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      productionYear: vehicle.productionYear,
      fuelType: vehicle.fuelType as VehiclePanel['fuelType'],
      currentMileage: vehicle.currentMileage,
      currency: vehicle.currencyCode,
      energy,
      nextService,
      monthCost,
      avgConsumption,
    };
  }

  private async energyVital(vehicleId: string, fuelType: string): Promise<VehiclePanel['energy']> {
    if (fuelType !== 'electric' && fuelType !== 'hybrid') return null;
    const rows = await this.db
      .select({ soc: chargingSessions.socEndPercent })
      .from(chargingSessions)
      .where(eq(chargingSessions.vehicleId, vehicleId))
      .orderBy(desc(chargingSessions.chargeDate), desc(chargingSessions.id))
      .limit(1);
    const soc = rows.at(0)?.soc ?? null;
    return soc === null ? null : { kind: 'charge', socPercent: soc, rangeKm: null };
  }

  private async nextServiceVital(
    vehicleId: string,
    currentMileage: number,
  ): Promise<VehiclePanel['nextService']> {
    const rows = await this.db
      .select({
        mode: reminders.mode,
        dueDate: reminders.dueDate,
        dueMileage: reminders.dueMileage,
        intervalKm: reminders.intervalKm,
        intervalMonths: reminders.intervalMonths,
        lastPerformedDate: reminders.lastPerformedDate,
        lastPerformedMileage: reminders.lastPerformedMileage,
      })
      .from(reminders)
      .innerJoin(reminderStatuses, eq(reminders.statusId, reminderStatuses.id))
      .where(and(eq(reminders.vehicleId, vehicleId), eq(reminderStatuses.code, 'pending')));

    const sorted = rows.sort((a, b) =>
      compareReminderUrgency(
        { ...a, mode: a.mode as 'one_off' | 'recurring', currentMileage, status: 'pending' },
        { ...b, mode: b.mode as 'one_off' | 'recurring', currentMileage, status: 'pending' },
      ),
    );

    const row = sorted.at(0);
    if (!row) return null;

    const urgency = computeReminderUrgency({
      ...row,
      mode: row.mode as 'one_off' | 'recurring',
      currentMileage,
      status: 'pending',
    });

    return {
      dueDate: urgency.nextDueDate,
      dueInKm: urgency.dueInKm,
      dueState: urgency.dueState,
    };
  }

  private async monthCostVital(
    vehicleId: string,
    currency: string,
  ): Promise<VehiclePanel['monthCost']> {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const firstOf = (yy: number, mm: number) =>
      `${String(yy)}-${String(mm + 1).padStart(2, '0')}-01`;
    const thisStart = firstOf(y, m);
    const nextStart = m === 11 ? firstOf(y + 1, 0) : firstOf(y, m + 1);
    const prevStart = m === 0 ? firstOf(y - 1, 11) : firstOf(y, m - 1);

    const sumBetween = async (start: string, end: string): Promise<number> => {
      const rows = await this.db
        .select({ total: sql<string>`coalesce(sum(${expenses.amount}), '0')` })
        .from(expenses)
        .where(
          and(
            eq(expenses.vehicleId, vehicleId),
            gte(expenses.expenseDate, start),
            lt(expenses.expenseDate, end),
          ),
        );
      return Number(rows.at(0)?.total ?? 0);
    };

    const [total, prevTotal] = await Promise.all([
      sumBetween(thisStart, nextStart),
      sumBetween(prevStart, thisStart),
    ]);
    return { total, prevTotal, currency };
  }

  private async avgConsumptionVital(
    vehicleId: string,
    fuelType: string,
  ): Promise<VehiclePanel['avgConsumption']> {
    const electric = fuelType === 'electric';
    const rows = electric
      ? await this.db
          .select({ mileage: chargingSessions.mileage, qty: chargingSessions.energyKwh })
          .from(chargingSessions)
          .where(
            and(eq(chargingSessions.vehicleId, vehicleId), eq(chargingSessions.isFullCharge, true)),
          )
          .orderBy(asc(chargingSessions.chargeDate), asc(chargingSessions.mileage))
      : await this.db
          .select({ mileage: fuelLogs.mileage, qty: fuelLogs.liters })
          .from(fuelLogs)
          .where(and(eq(fuelLogs.vehicleId, vehicleId), eq(fuelLogs.isFullTank, true)))
          .orderBy(asc(fuelLogs.fuelDate), asc(fuelLogs.mileage));

    let totalQty = 0;
    let totalDist = 0;
    for (let i = 1; i < rows.length; i++) {
      const curr = rows[i];
      const prev = rows[i - 1];
      if (!curr || !prev) continue;
      const dist = curr.mileage - prev.mileage;
      if (dist > 0) {
        totalQty += Number(curr.qty);
        totalDist += dist;
      }
    }

    if (totalDist <= 0) return null;
    const value = Math.round((totalQty / totalDist) * 100 * 10) / 10;
    return { value, unit: electric ? 'kwh_per_100km' : 'l_per_100km' };
  }

  private async assertVehicleOwned(userId: string, vehicleId: string): Promise<void> {
    const rows = await this.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);
    if (!rows.at(0)) throw this.notFound();
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Vehicle not found' });
  }
}
