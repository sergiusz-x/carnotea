import { reminders, reminderStatuses, vehicles, type Db } from '@carnotea/db';
import {
  ReminderCreateSchema,
  type Reminder,
  type ReminderCreate,
  type ReminderUpdate,
} from '@carnotea/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';

import { compareReminderUrgency, computeReminderUrgency } from './reminder-urgency.js';

const reminderSelection = {
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
  statusId: reminders.statusId,
  statusCode: reminderStatuses.code,
  notifiedAt: reminders.notifiedAt,
  createdAt: reminders.createdAt,
  updatedAt: reminders.updatedAt,
};

interface ReminderRow {
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
  statusId: number;
  statusCode: string;
  notifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['done', 'cancelled'],
};

const TERMINAL_STATUSES = new Set(['done', 'cancelled']);

@Injectable()
export class RemindersService {
  private statusIdCache: Record<string, number> | null = null;

  constructor(@Inject(DB) private readonly db: Db) {}

  async list(
    userId: string,
    vehicleId: string,
    filters?: { status?: string[]; dueState?: string },
  ): Promise<Reminder[]> {
    await this.assertVehicleOwned(userId, vehicleId);

    const conditions = [eq(reminders.vehicleId, vehicleId)];
    if (filters?.status?.length) {
      const statusIds = await Promise.all(filters.status.map((code) => this.resolveStatusId(code)));
      conditions.push(inArray(reminders.statusId, statusIds));
    }

    const rows = await this.db
      .select(reminderSelection)
      .from(reminders)
      .innerJoin(reminderStatuses, eq(reminders.statusId, reminderStatuses.id))
      .where(and(...conditions))
      .orderBy(desc(reminders.createdAt));

    const vehicleMileage = await this.getVehicleMileage(vehicleId);
    const responses = rows
      .map((row) => this.toResponse(row, vehicleMileage))
      .sort((a, b) =>
        compareReminderUrgency(
          {
            mode: a.mode,
            dueDate: a.dueDate,
            dueMileage: a.dueMileage,
            intervalKm: a.intervalKm,
            intervalMonths: a.intervalMonths,
            lastPerformedDate: a.lastPerformedDate,
            lastPerformedMileage: a.lastPerformedMileage,
            currentMileage: vehicleMileage,
            status: a.status,
          },
          {
            mode: b.mode,
            dueDate: b.dueDate,
            dueMileage: b.dueMileage,
            intervalKm: b.intervalKm,
            intervalMonths: b.intervalMonths,
            lastPerformedDate: b.lastPerformedDate,
            lastPerformedMileage: b.lastPerformedMileage,
            currentMileage: vehicleMileage,
            status: b.status,
          },
        ),
      );

    return filters?.dueState ? responses.filter((r) => r.dueState === filters.dueState) : responses;
  }

  async getOwnedOrThrow(userId: string, vehicleId: string, id: string): Promise<Reminder> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
      .select(reminderSelection)
      .from(reminders)
      .innerJoin(reminderStatuses, eq(reminders.statusId, reminderStatuses.id))
      .where(and(eq(reminders.id, id), eq(reminders.vehicleId, vehicleId)))
      .limit(1);

    const row = rows.at(0);
    if (!row) throw this.notFound();

    const mileage = await this.getVehicleMileage(vehicleId);
    return this.toResponse(row, mileage);
  }

  async create(userId: string, vehicleId: string, input: ReminderCreate): Promise<Reminder> {
    await this.assertVehicleOwned(userId, vehicleId);

    const statusId = await this.resolveStatusId(input.status);

    const inserted = await this.db
      .insert(reminders)
      .values({
        vehicleId,
        title: input.title,
        description: input.description ?? null,
        mode: input.mode,
        dueDate: input.mode === 'one_off' ? (input.dueDate ?? null) : null,
        dueMileage: input.mode === 'one_off' ? (input.dueMileage ?? null) : null,
        intervalKm: input.mode === 'recurring' ? (input.intervalKm ?? null) : null,
        intervalMonths: input.mode === 'recurring' ? (input.intervalMonths ?? null) : null,
        lastPerformedDate: input.mode === 'recurring' ? (input.lastPerformedDate ?? null) : null,
        lastPerformedMileage:
          input.mode === 'recurring' ? (input.lastPerformedMileage ?? null) : null,
        statusId,
      })
      .returning({ id: reminders.id });

    const created = inserted.at(0);
    if (!created) throw new InternalServerErrorException('Reminder insert returned no row');

    return this.getOwnedOrThrow(userId, vehicleId, created.id);
  }

  async update(
    userId: string,
    vehicleId: string,
    id: string,
    input: ReminderUpdate,
  ): Promise<Reminder> {
    await this.assertVehicleOwned(userId, vehicleId);

    const currentRows = await this.db
      .select(reminderSelection)
      .from(reminders)
      .innerJoin(reminderStatuses, eq(reminders.statusId, reminderStatuses.id))
      .where(and(eq(reminders.id, id), eq(reminders.vehicleId, vehicleId)))
      .limit(1);

    const current = currentRows.at(0);
    if (!current) throw this.notFound();

    if (input.status !== undefined && input.status !== current.statusCode) {
      const allowed = VALID_TRANSITIONS[current.statusCode];
      if (!allowed || !allowed.includes(input.status)) {
        if (TERMINAL_STATUSES.has(current.statusCode)) {
          throw new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: `Cannot transition from terminal status '${current.statusCode}' to '${input.status}'.`,
          });
        }
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: `Invalid status transition from '${current.statusCode}' to '${input.status}'.`,
        });
      }
    }

    const merged = {
      title: input.title ?? current.title,
      description: input.description !== undefined ? input.description : current.description,
      mode: (input.mode ?? current.mode) as ReminderCreate['mode'],
      dueDate: input.dueDate !== undefined ? input.dueDate : current.dueDate,
      dueMileage: input.dueMileage !== undefined ? input.dueMileage : current.dueMileage,
      intervalKm: input.intervalKm !== undefined ? input.intervalKm : current.intervalKm,
      intervalMonths:
        input.intervalMonths !== undefined ? input.intervalMonths : current.intervalMonths,
      lastPerformedDate:
        input.lastPerformedDate !== undefined ? input.lastPerformedDate : current.lastPerformedDate,
      lastPerformedMileage:
        input.lastPerformedMileage !== undefined
          ? input.lastPerformedMileage
          : current.lastPerformedMileage,
      status: input.status ?? current.statusCode,
    };

    const parsed = ReminderCreateSchema.safeParse(merged);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid reminder payload',
        issues: parsed.error.issues,
      });
    }

    const statusId =
      input.status !== undefined ? await this.resolveStatusId(input.status) : current.statusId;
    const updates: Partial<typeof reminders.$inferInsert> = {
      updatedAt: new Date(),
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      mode: parsed.data.mode,
      dueDate: parsed.data.mode === 'one_off' ? (parsed.data.dueDate ?? null) : null,
      dueMileage: parsed.data.mode === 'one_off' ? (parsed.data.dueMileage ?? null) : null,
      intervalKm: parsed.data.mode === 'recurring' ? (parsed.data.intervalKm ?? null) : null,
      intervalMonths:
        parsed.data.mode === 'recurring' ? (parsed.data.intervalMonths ?? null) : null,
      lastPerformedDate:
        parsed.data.mode === 'recurring' ? (parsed.data.lastPerformedDate ?? null) : null,
      lastPerformedMileage:
        parsed.data.mode === 'recurring' ? (parsed.data.lastPerformedMileage ?? null) : null,
      statusId,
    };

    const affected = await this.db
      .update(reminders)
      .set(updates)
      .where(and(eq(reminders.id, id), eq(reminders.vehicleId, vehicleId)))
      .returning({ id: reminders.id });

    if (affected.length === 0) throw this.notFound();

    return this.getOwnedOrThrow(userId, vehicleId, id);
  }

  async remove(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.assertVehicleOwned(userId, vehicleId);

    const deleted = await this.db
      .delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.vehicleId, vehicleId)))
      .returning({ id: reminders.id });

    if (deleted.length === 0) throw this.notFound();
  }

  private async assertVehicleOwned(userId: string, vehicleId: string): Promise<void> {
    const rows = await this.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);
    if (!rows.at(0)) throw this.notFound();
  }

  private async getVehicleMileage(vehicleId: string): Promise<number | null> {
    const rows = await this.db
      .select({ currentMileage: vehicles.currentMileage })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);
    return rows.at(0)?.currentMileage ?? null;
  }

  private async resolveStatusId(code: string): Promise<number> {
    if (!this.statusIdCache) {
      await this.loadStatusCache();
    }

    const cache = this.statusIdCache;
    if (!cache) throw new InternalServerErrorException('Status cache failed to load');
    const cached = cache[code];
    if (cached === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Unknown reminder status: ${code}`,
      });
    }
    return cached;
  }

  private async loadStatusCache(): Promise<void> {
    const rows = await this.db
      .select({ id: reminderStatuses.id, code: reminderStatuses.code })
      .from(reminderStatuses);

    this.statusIdCache = {};
    for (const row of rows) {
      this.statusIdCache[row.code] = row.id;
    }
  }

  private toResponse(row: ReminderRow, currentMileage: number | null): Reminder {
    const urgency = computeReminderUrgency({
      mode: row.mode as Reminder['mode'],
      dueDate: row.dueDate,
      dueMileage: row.dueMileage,
      intervalKm: row.intervalKm,
      intervalMonths: row.intervalMonths,
      lastPerformedDate: row.lastPerformedDate,
      lastPerformedMileage: row.lastPerformedMileage,
      currentMileage,
      status: row.statusCode,
    });

    return {
      id: row.id,
      vehicleId: row.vehicleId,
      title: row.title,
      description: row.description,
      mode: row.mode as Reminder['mode'],
      dueDate: row.dueDate,
      dueMileage: row.dueMileage,
      intervalKm: row.intervalKm,
      intervalMonths: row.intervalMonths,
      lastPerformedDate: row.lastPerformedDate,
      lastPerformedMileage: row.lastPerformedMileage,
      nextDueDate: urgency.nextDueDate,
      nextDueMileage: urgency.nextDueMileage,
      status: row.statusCode as Reminder['status'],
      dueState: urgency.dueState,
      notifiedAt: row.notifiedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Reminder not found' });
  }
}
