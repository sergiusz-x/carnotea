import {
  authUser,
  authVerification,
  chargerTypes,
  chargingSessions,
  expenseCategories,
  expenses,
  fuelLogs,
  fuelTypes,
  issues,
  issuePriorities,
  issueStatuses,
  mileageReadings,
  reminders,
  reminderStatuses,
  serviceRecords,
  users,
  vehicles,
  type Db,
} from '@carnotea/db';
import {
  ErrorResponseSchema,
  ROUTES,
  computeDueState,
  type ChargingSession,
  type Expense,
  type FuelLog,
  type Issue,
  type MileageReading,
  type Reminder,
  type ServiceRecordResponse,
  type UserProfile,
  type Vehicle,
} from '@carnotea/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import { AuthGuard } from '../auth/auth.guard.js';
import { type AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { DB } from '../db/db.constants.js';
import { zodRoute, ZodValidationPipe } from '../lib/openapi/index.js';

import {
  AccountExportSchema,
  DeleteAccountBodySchema,
  type AccountExport,
} from './account.schema.js';

const meExportNestPath = ROUTES.meExport.slice(1);
const meNestPath = ROUTES.me.slice(1);

zodRoute({
  method: 'get',
  path: ROUTES.meExport,
  operationId: 'exportMe',
  summary: 'Export all personal data as a machine-readable JSON file (GDPR Art. 20)',
  tags: ['Users'],
  responses: {
    '200': {
      description: 'Complete data export for the authenticated user',
      schema: AccountExportSchema,
    },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'delete',
  path: ROUTES.me,
  operationId: 'deleteMe',
  summary: 'Permanently delete account and all owned data (GDPR Art. 17)',
  tags: ['Users'],
  request: { body: DeleteAccountBodySchema },
  responses: {
    '204': { description: 'Account deleted' },
    '400': { description: 'Confirmation does not match email', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
  },
});

@Controller()
@UseGuards(AuthGuard)
export class AccountController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get(meExportNestPath)
  @Header('Content-Disposition', 'attachment; filename="carnotea-export.json"')
  async exportMe(@CurrentUser() user: AuthUser): Promise<AccountExport> {
    const userId = user.id;

    // ── Profile ───────────────────────────────────────────────────────────────
    const profileRow = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!profileRow) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'User profile not found' });
    }

    const profile: UserProfile = {
      id: profileRow.id,
      firstName: profileRow.firstName,
      lastName: profileRow.lastName,
      email: profileRow.email,
      localePref: profileRow.localePref as 'pl' | 'en',
      unitsPref: profileRow.unitsPref as 'metric' | 'imperial',
      currencyPref: profileRow.currencyPref,
      createdAt: profileRow.createdAt.toISOString(),
      updatedAt: profileRow.updatedAt.toISOString(),
    };

    // ── Vehicles (joined with fuel-type lookup) ───────────────────────────────
    const vehicleRows = await this.db
      .select({
        id: vehicles.id,
        brand: vehicles.brand,
        model: vehicles.model,
        generation: vehicles.generation,
        productionYear: vehicles.productionYear,
        engine: vehicles.engine,
        fuelType: fuelTypes.code,
        vin: vehicles.vin,
        registrationNumber: vehicles.registrationNumber,
        currentMileage: vehicles.currentMileage,
        currencyCode: vehicles.currencyCode,
        createdAt: vehicles.createdAt,
        updatedAt: vehicles.updatedAt,
      })
      .from(vehicles)
      .innerJoin(fuelTypes, eq(vehicles.fuelTypeId, fuelTypes.id))
      .where(eq(vehicles.userId, userId));

    const vehicleList: Vehicle[] = vehicleRows.map((row) => ({
      id: row.id,
      brand: row.brand,
      model: row.model,
      generation: row.generation ?? null,
      productionYear: row.productionYear,
      engine: row.engine ?? null,
      fuelType: row.fuelType as Vehicle['fuelType'],
      vin: row.vin ?? null,
      registrationNumber: row.registrationNumber ?? null,
      currentMileage: row.currentMileage,
      currencyCode: row.currencyCode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    const vehicleIds = vehicleRows.map((v) => v.id);
    const hasVehicles = vehicleIds.length > 0;

    // ── Fuel logs ─────────────────────────────────────────────────────────────
    const fuelLogRows = hasVehicles
      ? await this.db.select().from(fuelLogs).where(inArray(fuelLogs.vehicleId, vehicleIds))
      : [];

    const fuelLogList: FuelLog[] = fuelLogRows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      fuelDate: row.fuelDate,
      mileage: row.mileage,
      liters: Number(row.liters),
      pricePerLiter: Number(row.pricePerLiter),
      totalCost: Number(row.totalCost),
      stationName: row.stationName ?? null,
      description: row.description ?? null,
      isFullTank: row.isFullTank,
      createdAt: row.createdAt.toISOString(),
    }));

    // ── Charging sessions (joined with charger-type lookup) ───────────────────
    const chargingRows = hasVehicles
      ? await this.db
          .select({
            id: chargingSessions.id,
            vehicleId: chargingSessions.vehicleId,
            chargeDate: chargingSessions.chargeDate,
            mileage: chargingSessions.mileage,
            energyKwh: chargingSessions.energyKwh,
            pricePerKwh: chargingSessions.pricePerKwh,
            totalCost: chargingSessions.totalCost,
            chargerType: chargerTypes.code,
            socStartPercent: chargingSessions.socStartPercent,
            socEndPercent: chargingSessions.socEndPercent,
            stationName: chargingSessions.stationName,
            isFullCharge: chargingSessions.isFullCharge,
            createdAt: chargingSessions.createdAt,
          })
          .from(chargingSessions)
          .innerJoin(chargerTypes, eq(chargingSessions.chargerTypeId, chargerTypes.id))
          .where(inArray(chargingSessions.vehicleId, vehicleIds))
      : [];

    const chargingList: ChargingSession[] = chargingRows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      chargeDate: row.chargeDate,
      mileage: row.mileage,
      energyKwh: Number(row.energyKwh),
      pricePerKwh: Number(row.pricePerKwh),
      totalCost: Number(row.totalCost),
      chargerType: row.chargerType as ChargingSession['chargerType'],
      socStartPercent: row.socStartPercent ?? null,
      socEndPercent: row.socEndPercent ?? null,
      stationName: row.stationName ?? null,
      isFullCharge: row.isFullCharge,
      createdAt: row.createdAt.toISOString(),
    }));

    // ── Mileage readings ──────────────────────────────────────────────────────
    const mileageRows = hasVehicles
      ? await this.db
          .select()
          .from(mileageReadings)
          .where(inArray(mileageReadings.vehicleId, vehicleIds))
      : [];

    const mileageList: MileageReading[] = mileageRows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      readingDate: row.readingDate,
      mileage: row.mileage,
      sourceType: row.sourceType as MileageReading['sourceType'],
      sourceId: row.sourceId ?? null,
      note: row.note ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    // ── Service records ───────────────────────────────────────────────────────
    const serviceRows = hasVehicles
      ? await this.db
          .select()
          .from(serviceRecords)
          .where(inArray(serviceRecords.vehicleId, vehicleIds))
      : [];

    const serviceList: ServiceRecordResponse[] = serviceRows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      serviceDate: row.serviceDate,
      mileage: row.mileage,
      title: row.title,
      description: row.description ?? null,
      laborCost: Number(row.laborCost),
      totalCost: Number(row.totalCost),
      workshopName: row.workshopName ?? null,
      parts: [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    // ── Issues (joined with status + priority) ────────────────────────────────
    const issueRows = hasVehicles
      ? await this.db
          .select({
            id: issues.id,
            vehicleId: issues.vehicleId,
            reportedDate: issues.reportedDate,
            resolvedDate: issues.resolvedDate,
            title: issues.title,
            description: issues.description,
            status: issueStatuses.code,
            priority: issuePriorities.code,
            relatedServiceRecordId: issues.relatedServiceRecordId,
            createdAt: issues.createdAt,
            updatedAt: issues.updatedAt,
          })
          .from(issues)
          .innerJoin(issueStatuses, eq(issues.statusId, issueStatuses.id))
          .innerJoin(issuePriorities, eq(issues.priorityId, issuePriorities.id))
          .where(inArray(issues.vehicleId, vehicleIds))
      : [];

    const issueList: Issue[] = issueRows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      reportedDate: row.reportedDate,
      resolvedDate: row.resolvedDate ?? null,
      title: row.title,
      description: row.description ?? null,
      status: row.status as Issue['status'],
      priority: row.priority as Issue['priority'],
      relatedServiceRecordId: row.relatedServiceRecordId ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    // ── Expenses (joined with category) ──────────────────────────────────────
    const expenseRows = hasVehicles
      ? await this.db
          .select({
            id: expenses.id,
            vehicleId: expenses.vehicleId,
            category: expenseCategories.code,
            expenseDate: expenses.expenseDate,
            amount: expenses.amount,
            description: expenses.description,
            sourceType: expenses.sourceType,
            sourceId: expenses.sourceId,
            createdAt: expenses.createdAt,
            updatedAt: expenses.updatedAt,
          })
          .from(expenses)
          .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
          .where(inArray(expenses.vehicleId, vehicleIds))
      : [];

    const expenseList: Expense[] = expenseRows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      category: row.category as Expense['category'],
      expenseDate: row.expenseDate,
      amount: Number(row.amount),
      description: row.description ?? null,
      sourceType: row.sourceType as Expense['sourceType'],
      sourceId: row.sourceId ?? null,
      isAutoSynced: row.sourceType !== 'manual',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    // ── Reminders (joined with status) ────────────────────────────────────────
    const reminderRows = hasVehicles
      ? await this.db
          .select({
            id: reminders.id,
            vehicleId: reminders.vehicleId,
            title: reminders.title,
            description: reminders.description,
            dueDate: reminders.dueDate,
            dueMileage: reminders.dueMileage,
            statusCode: reminderStatuses.code,
            notifiedAt: reminders.notifiedAt,
            createdAt: reminders.createdAt,
            updatedAt: reminders.updatedAt,
          })
          .from(reminders)
          .innerJoin(reminderStatuses, eq(reminders.statusId, reminderStatuses.id))
          .where(inArray(reminders.vehicleId, vehicleIds))
      : [];

    const reminderList: Reminder[] = reminderRows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      title: row.title,
      description: row.description ?? null,
      dueDate: row.dueDate ?? null,
      dueMileage: row.dueMileage ?? null,
      status: row.statusCode as Reminder['status'],
      dueState: computeDueState({
        dueDate: row.dueDate,
        dueMileage: row.dueMileage,
        currentMileage: null,
        status: row.statusCode,
      }),
      notifiedAt: row.notifiedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      profile,
      vehicles: vehicleList,
      fuelLogs: fuelLogList,
      chargingSessions: chargingList,
      mileageReadings: mileageList,
      serviceRecords: serviceList,
      issues: issueList,
      expenses: expenseList,
      reminders: reminderList,
    };
  }

  @Delete(meNestPath)
  @HttpCode(204)
  async deleteMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(DeleteAccountBodySchema)) body: { confirmation: string },
  ): Promise<void> {
    if (body.confirmation.toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Confirmation does not match your email address',
        issues: [
          {
            code: 'custom',
            path: ['confirmation'],
            message: 'Must match your email address',
          },
        ],
      });
    }

    await this.db.transaction(async (tx) => {
      // Domain deletion cascades: users → vehicles → all child tables.
      await tx.delete(users).where(eq(users.id, user.id));

      // better-auth verifications keyed by email (no userId FK) — delete separately.
      await tx.delete(authVerification).where(eq(authVerification.identifier, user.email));

      // better-auth user cascades to auth_session and auth_account.
      await tx.delete(authUser).where(eq(authUser.id, user.id));
    });
  }
}
