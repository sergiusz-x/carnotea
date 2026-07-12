import {
  expenseCategories,
  expenses,
  fuelLogs,
  reminderStatuses,
  reminders,
  vehicles,
  type Db,
} from '@carnotea/db';
import {
  type DashboardOverview,
  type ExpenseByCategory,
  type ExpenseCategoryCode,
  type MonthlySpend,
  type UpcomingReminder,
} from '@carnotea/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';
import { compareReminderUrgency, computeReminderUrgency } from '../reminders/reminder-urgency.js';

interface ReminderJoinRow {
  id: string;
  vehicleId: string;
  title: string;
  description: string | null;
  mode: string;
  dueDate: string | null;
  dueMileage: number | null;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastPerformedDate: string | null;
  lastPerformedMileage: number | null;
  statusCode: string;
  createdAt: Date;
  updatedAt: Date;
  currentMileage: number | null;
}

const TWELVE_MONTHS_AGO = new Date();
TWELVE_MONTHS_AGO.setMonth(TWELVE_MONTHS_AGO.getMonth() - 12);
const TWELVE_MONTHS_AGO_STR = TWELVE_MONTHS_AGO.toISOString().slice(0, 10);

@Injectable()
export class DashboardService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getOverview(userId: string): Promise<DashboardOverview> {
    const vehicleCountRows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(vehicles)
      .where(eq(vehicles.userId, userId));

    const totalVehicles = vehicleCountRows.at(0)?.count ?? 0;

    if (totalVehicles === 0) {
      return {
        totalVehicles: 0,
        totalExpenses: 0,
        totalFuelCost: 0,
        avgFuelConsumption: null,
        currency: 'EUR',
      };
    }

    const userVehicleRows = await this.db
      .select({ id: vehicles.id, currencyCode: vehicles.currencyCode })
      .from(vehicles)
      .where(eq(vehicles.userId, userId));

    const vehicleIds = userVehicleRows.map((r) => r.id);
    const currency = userVehicleRows.at(0)?.currencyCode ?? 'EUR';

    const expenseRows = await this.db
      .select({ total: sql<string>`coalesce(sum(${expenses.amount}), '0')` })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(
        and(
          inArray(expenses.vehicleId, vehicleIds),
          gte(expenses.expenseDate, TWELVE_MONTHS_AGO_STR),
        ),
      );

    const totalExpenses = Number(expenseRows.at(0)?.total ?? 0);

    const fuelCostRows = await this.db
      .select({ total: sql<string>`coalesce(sum(${fuelLogs.totalCost}), '0')` })
      .from(fuelLogs)
      .where(
        and(inArray(fuelLogs.vehicleId, vehicleIds), gte(fuelLogs.fuelDate, TWELVE_MONTHS_AGO_STR)),
      );

    const totalFuelCost = Number(fuelCostRows.at(0)?.total ?? 0);

    const consumptionRows = await this.db.execute<{
      avg_liters: string;
      avg_mileage_delta: string;
    }>(sql`
      WITH ranked_fuel AS (
        SELECT
          ${fuelLogs.id},
          ${fuelLogs.vehicleId},
          ${fuelLogs.fuelDate},
          ${fuelLogs.mileage},
          ${fuelLogs.liters},
          ${fuelLogs.isFullTank},
          LAG(${fuelLogs.mileage}) OVER (
            PARTITION BY ${fuelLogs.vehicleId}
            ORDER BY ${fuelLogs.fuelDate}, ${fuelLogs.id}
          ) AS prev_mileage,
          LAG(${fuelLogs.isFullTank}) OVER (
            PARTITION BY ${fuelLogs.vehicleId}
            ORDER BY ${fuelLogs.fuelDate}, ${fuelLogs.id}
          ) AS prev_full
        FROM ${fuelLogs}
        WHERE ${inArray(fuelLogs.vehicleId, vehicleIds)}
          AND ${fuelLogs.isFullTank} = TRUE
      )
      SELECT
        COALESCE(AVG(ranked_fuel.liters)::text, '0') AS avg_liters,
        COALESCE(AVG(ranked_fuel.mileage - ranked_fuel.prev_mileage)::text, '0') AS avg_mileage_delta
      FROM ranked_fuel
      WHERE ranked_fuel.is_full_tank = TRUE
        AND ranked_fuel.prev_full = TRUE
        AND ranked_fuel.mileage > ranked_fuel.prev_mileage
    `);

    const avgLiters = Number(consumptionRows.at(0)?.avg_liters ?? 0);
    const avgMileageDelta = Number(consumptionRows.at(0)?.avg_mileage_delta ?? 0);
    const avgFuelConsumption = avgMileageDelta > 0 ? (avgLiters / avgMileageDelta) * 100 : null;

    return {
      totalVehicles,
      totalExpenses,
      totalFuelCost,
      avgFuelConsumption:
        avgFuelConsumption !== null ? Math.round(avgFuelConsumption * 100) / 100 : null,
      currency,
    };
  }

  async getExpensesByCategory(
    userId: string,
  ): Promise<{ items: ExpenseByCategory[]; currency: string }> {
    const userVehicleRows = await this.db
      .select({ id: vehicles.id, currencyCode: vehicles.currencyCode })
      .from(vehicles)
      .where(eq(vehicles.userId, userId));

    if (userVehicleRows.length === 0) return { items: [], currency: 'EUR' };

    const vehicleIds = userVehicleRows.map((r) => r.id);
    const currency = userVehicleRows.at(0)?.currencyCode ?? 'EUR';

    const rows = await this.db
      .select({
        category: expenseCategories.code,
        total: sql<string>`coalesce(sum(${expenses.amount}), '0')`,
        count: sql<number>`count(*)::int`,
      })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(
        and(
          inArray(expenses.vehicleId, vehicleIds),
          gte(expenses.expenseDate, TWELVE_MONTHS_AGO_STR),
        ),
      )
      .groupBy(expenseCategories.code)
      .orderBy(desc(sql`coalesce(sum(${expenses.amount}), '0')`));

    return {
      items: rows.map((r) => ({
        category: r.category as ExpenseCategoryCode,
        total: Number(r.total),
        count: r.count,
      })),
      currency,
    };
  }

  async getMonthlySpend(userId: string): Promise<MonthlySpend[]> {
    const userVehicleRows = await this.db
      .select({ id: vehicles.id, currencyCode: vehicles.currencyCode })
      .from(vehicles)
      .where(eq(vehicles.userId, userId));

    if (userVehicleRows.length === 0) return [];

    const vehicleIds = userVehicleRows.map((r) => r.id);
    const currency = userVehicleRows.at(0)?.currencyCode ?? 'EUR';

    const rows = await this.db
      .select({
        year: sql<number>`extract(year from ${expenses.expenseDate})::int`,
        month: sql<number>`extract(month from ${expenses.expenseDate})::int`,
        total: sql<string>`coalesce(sum(${expenses.amount}), '0')`,
      })
      .from(expenses)
      .where(
        and(
          inArray(expenses.vehicleId, vehicleIds),
          gte(expenses.expenseDate, TWELVE_MONTHS_AGO_STR),
        ),
      )
      .groupBy(
        sql`extract(year from ${expenses.expenseDate})`,
        sql`extract(month from ${expenses.expenseDate})`,
      )
      .orderBy(
        sql`extract(year from ${expenses.expenseDate})`,
        sql`extract(month from ${expenses.expenseDate})`,
      );

    return rows.map((r) => ({ year: r.year, month: r.month, total: Number(r.total), currency }));
  }

  async getUpcomingReminders(userId: string): Promise<UpcomingReminder[]> {
    const rows: ReminderJoinRow[] = await this.db
      .select({
        id: reminders.id,
        vehicleId: reminders.vehicleId,
        title: reminders.title,
        description: reminders.description,
        mode: reminders.mode,
        dueDate: reminders.dueDate,
        dueMileage: reminders.dueMileage,
        intervalKm: reminders.intervalKm,
        intervalMonths: reminders.intervalMonths,
        lastPerformedDate: reminders.lastPerformedDate,
        lastPerformedMileage: reminders.lastPerformedMileage,
        statusCode: reminderStatuses.code,
        createdAt: reminders.createdAt,
        updatedAt: reminders.updatedAt,
        currentMileage: vehicles.currentMileage,
      })
      .from(reminders)
      .innerJoin(reminderStatuses, eq(reminders.statusId, reminderStatuses.id))
      .innerJoin(vehicles, eq(reminders.vehicleId, vehicles.id))
      .where(and(eq(vehicles.userId, userId), eq(reminderStatuses.code, 'pending')));

    return rows
      .map((row) => {
        const urgency = computeReminderUrgency({
          mode: row.mode as UpcomingReminder['mode'],
          dueDate: row.dueDate,
          dueMileage: row.dueMileage,
          intervalKm: row.intervalKm,
          intervalMonths: row.intervalMonths,
          lastPerformedDate: row.lastPerformedDate,
          lastPerformedMileage: row.lastPerformedMileage,
          currentMileage: row.currentMileage,
          status: row.statusCode,
        });

        return {
          row,
          urgency,
        };
      })
      .filter(({ urgency }) => urgency.dueState === 'overdue' || urgency.dueState === 'due_soon')
      .sort((a, b) =>
        compareReminderUrgency(
          {
            mode: a.row.mode as UpcomingReminder['mode'],
            dueDate: a.row.dueDate,
            dueMileage: a.row.dueMileage,
            intervalKm: a.row.intervalKm,
            intervalMonths: a.row.intervalMonths,
            lastPerformedDate: a.row.lastPerformedDate,
            lastPerformedMileage: a.row.lastPerformedMileage,
            currentMileage: a.row.currentMileage,
            status: a.row.statusCode,
          },
          {
            mode: b.row.mode as UpcomingReminder['mode'],
            dueDate: b.row.dueDate,
            dueMileage: b.row.dueMileage,
            intervalKm: b.row.intervalKm,
            intervalMonths: b.row.intervalMonths,
            lastPerformedDate: b.row.lastPerformedDate,
            lastPerformedMileage: b.row.lastPerformedMileage,
            currentMileage: b.row.currentMileage,
            status: b.row.statusCode,
          },
        ),
      )
      .map(({ row, urgency }) => ({
        id: row.id,
        vehicleId: row.vehicleId,
        title: row.title,
        description: row.description,
        mode: row.mode as UpcomingReminder['mode'],
        dueDate: row.dueDate,
        dueMileage: row.dueMileage,
        intervalKm: row.intervalKm,
        intervalMonths: row.intervalMonths,
        lastPerformedDate: row.lastPerformedDate,
        lastPerformedMileage: row.lastPerformedMileage,
        nextDueDate: urgency.nextDueDate,
        nextDueMileage: urgency.nextDueMileage,
        status: row.statusCode,
        dueState: urgency.dueState as 'overdue' | 'due_soon',
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
  }
}
