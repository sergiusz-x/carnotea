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
  computeDueState,
  type DashboardOverview,
  type ExpenseByCategory,
  type ExpenseCategoryCode,
  type MonthlySpend,
  type UpcomingReminder,
} from '@carnotea/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';

interface ReminderJoinRow {
  id: string;
  vehicleId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueMileage: number | null;
  statusCode: string;
  createdAt: Date;
  updatedAt: Date;
  currentMileage: number | null;
}

const TWELVE_MONTHS_AGO = new Date();
TWELVE_MONTHS_AGO.setMonth(TWELVE_MONTHS_AGO.getMonth() - 12);
const TWELVE_MONTHS_AGO_STR = TWELVE_MONTHS_AGO.toISOString().slice(0, 10);

const THIRTY_DAYS_FROM_NOW = new Date();
THIRTY_DAYS_FROM_NOW.setDate(THIRTY_DAYS_FROM_NOW.getDate() + 30);
const THIRTY_DAYS_FROM_NOW_STR = THIRTY_DAYS_FROM_NOW.toISOString().slice(0, 10);

@Injectable()
export class DashboardService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * GET /api/dashboard/overview — user-scoped summary.
   * Returns the first vehicle's currency (assumes single-currency for now,
   * multi-currency vehicles get the currency label but totals are NOT converted).
   */
  async getOverview(userId: string): Promise<DashboardOverview> {
    // Count vehicles
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

    // Get user's vehicle IDs
    const userVehicleRows = await this.db
      .select({ id: vehicles.id, currencyCode: vehicles.currencyCode })
      .from(vehicles)
      .where(eq(vehicles.userId, userId));

    const vehicleIds = userVehicleRows.map((r) => r.id);
    const currency = userVehicleRows.at(0)?.currencyCode ?? 'EUR';

    // Total expenses (last 12 months) — from expense table
    const expenseRows = await this.db
      .select({
        total: sql<string>`coalesce(sum(${expenses.amount}), '0')`,
        fuelTotal: sql<string>`coalesce(sum(case when ${expenseCategories.code} = 'fuel' then ${expenses.amount} else 0 end), '0')`,
      })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(
        and(
          sql`${expenses.vehicleId} = ANY(${vehicleIds}::uuid[])`,
          gte(expenses.expenseDate, TWELVE_MONTHS_AGO_STR),
        ),
      );

    const totalExpenses = Number(expenseRows.at(0)?.total ?? 0);
    const totalFuelCost = Number(expenseRows.at(0)?.fuelTotal ?? 0);

    // Average fuel consumption from full-tank fuel logs — uses CTE + lateral join
    const consumptionRows = await this.db.execute<{
      avgLiters: string;
      avgMileageDelta: string;
    }>(
      sql`
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
          WHERE ${fuelLogs.vehicleId} = ANY(${vehicleIds}::uuid[])
            AND ${fuelLogs.isFullTank} = TRUE
        )
        SELECT
          COALESCE(AVG(ranked_fuel.liters)::text, '0') AS avg_liters,
          COALESCE(AVG(ranked_fuel.mileage - ranked_fuel.prev_mileage)::text, '0') AS avg_mileage_delta
        FROM ranked_fuel
        WHERE ranked_fuel.is_full_tank = TRUE
          AND ranked_fuel.prev_full = TRUE
          AND ranked_fuel.mileage > ranked_fuel.prev_mileage
      `,
    );

    // Compute avg L/100km = (avg liters / avg mileage_delta) * 100
    const avgLiters = Number(consumptionRows.at(0)?.avgLiters ?? 0);
    const avgMileageDelta = Number(consumptionRows.at(0)?.avgMileageDelta ?? 0);
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

  /**
   * GET /api/dashboard/expenses-by-category — last 12 months grouped by category.
   */
  async getExpensesByCategory(
    userId: string,
  ): Promise<{ items: ExpenseByCategory[]; currency: string }> {
    const userVehicleRows = await this.db
      .select({ id: vehicles.id, currencyCode: vehicles.currencyCode })
      .from(vehicles)
      .where(eq(vehicles.userId, userId));

    if (userVehicleRows.length === 0) {
      return { items: [], currency: 'EUR' };
    }

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
          sql`${expenses.vehicleId} = ANY(${vehicleIds}::uuid[])`,
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

  /**
   * GET /api/dashboard/monthly-spend — last 12 months, per month.
   */
  async getMonthlySpend(userId: string): Promise<MonthlySpend[]> {
    const userVehicleRows = await this.db
      .select({ id: vehicles.id, currencyCode: vehicles.currencyCode })
      .from(vehicles)
      .where(eq(vehicles.userId, userId));

    if (userVehicleRows.length === 0) {
      return [];
    }

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
          sql`${expenses.vehicleId} = ANY(${vehicleIds}::uuid[])`,
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

  /**
   * GET /api/dashboard/upcoming-reminders — reminders due within 30 days across all vehicles.
   * Returns both overdue and due_soon reminders, ordered by urgency.
   */
  async getUpcomingReminders(userId: string): Promise<UpcomingReminder[]> {
    const userVehicleRows = await this.db
      .select({ id: vehicles.id, currentMileage: vehicles.currentMileage })
      .from(vehicles)
      .where(eq(vehicles.userId, userId));

    if (userVehicleRows.length === 0) return [];

    const vehicleIds = userVehicleRows.map((r) => r.id);

    const rows: ReminderJoinRow[] = await this.db
      .select({
        id: reminders.id,
        vehicleId: reminders.vehicleId,
        title: reminders.title,
        description: reminders.description,
        dueDate: reminders.dueDate,
        dueMileage: reminders.dueMileage,
        statusCode: reminderStatuses.code,
        createdAt: reminders.createdAt,
        updatedAt: reminders.updatedAt,
        currentMileage: vehicles.currentMileage,
      })
      .from(reminders)
      .innerJoin(reminderStatuses, eq(reminders.statusId, reminderStatuses.id))
      .innerJoin(vehicles, eq(reminders.vehicleId, vehicles.id))
      .where(
        and(
          sql`${reminders.vehicleId} = ANY(${vehicleIds}::uuid[])`,
          sql`${reminders.dueDate} IS NOT NULL`,
          sql`${reminders.dueDate} <= ${THIRTY_DAYS_FROM_NOW_STR}`,
          eq(reminderStatuses.code, 'pending'),
        ),
      )
      .orderBy(reminders.dueDate);

    const results: UpcomingReminder[] = [];

    for (const row of rows) {
      const dueState = computeDueState({
        dueDate: row.dueDate,
        dueMileage: row.dueMileage,
        currentMileage: row.currentMileage,
        status: row.statusCode,
      });

      if (dueState === 'overdue' || dueState === 'due_soon') {
        results.push({
          id: row.id,
          vehicleId: row.vehicleId,
          title: row.title,
          description: row.description,
          dueDate: row.dueDate,
          dueMileage: row.dueMileage,
          status: row.statusCode,
          dueState,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        });
      }
    }

    // Sort: overdue first, then due_soon by dueDate ascending
    results.sort((a, b) => {
      if (a.dueState !== b.dueState) return a.dueState === 'overdue' ? -1 : 1;
      if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      return 0;
    });

    return results;
  }
}
