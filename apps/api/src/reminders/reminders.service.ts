import { reminders, reminderStatuses, vehicles, type Db } from '@carnotea/db';
import {
  type ReminderCreate,
  type ReminderUpdate,
  computeDueState,
  type DueState,
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

/** Read projection: reminder row joined with its status lookup code. */
const reminderSelection = {
  id: reminders.id,
  vehicleId: reminders.vehicleId,
  title: reminders.title,
  description: reminders.description,
  dueDate: reminders.dueDate,
  dueMileage: reminders.dueMileage,
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
  dueDate: string | null;
  dueMileage: number | null;
  statusId: number;
  statusCode: string;
  notifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderResponse {
  id: string;
  vehicleId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueMileage: number | null;
  status: string;
  dueState: DueState;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Valid status transitions: from pending → done or cancelled. */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['done', 'cancelled'],
};

/** Terminal statuses that cannot transition back to pending. */
const TERMINAL_STATUSES = new Set(['done', 'cancelled']);

@Injectable()
export class RemindersService {
  private statusIdCache: Record<string, number> | null = null;

  constructor(@Inject(DB) private readonly db: Db) {}

  async list(
    userId: string,
    vehicleId: string,
    filters?: { status?: string[]; dueState?: string },
  ): Promise<ReminderResponse[]> {
    await this.assertVehicleOwned(userId, vehicleId);

    const conditions = [eq(reminders.vehicleId, vehicleId)];

    if (filters?.status && filters.status.length > 0) {
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
    const allResponses = rows.map((row) => this.toResponse(row, vehicleMileage));

    if (filters?.dueState) {
      return allResponses.filter((r) => r.dueState === filters.dueState);
    }

    return allResponses;
  }

  async getOwnedOrThrow(userId: string, vehicleId: string, id: string): Promise<ReminderResponse> {
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

  async create(
    userId: string,
    vehicleId: string,
    input: ReminderCreate,
  ): Promise<ReminderResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const statusId = await this.resolveStatusId(input.status);

    const inserted = await this.db
      .insert(reminders)
      .values({
        vehicleId,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        dueMileage: input.dueMileage ?? null,
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
  ): Promise<ReminderResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    // Fetch current state for merged validation
    const currentRows = await this.db
      .select(reminderSelection)
      .from(reminders)
      .innerJoin(reminderStatuses, eq(reminders.statusId, reminderStatuses.id))
      .where(and(eq(reminders.id, id), eq(reminders.vehicleId, vehicleId)))
      .limit(1);

    const current = currentRows.at(0);
    if (!current) throw this.notFound();

    // Status transition validation
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

    // Merge the body with persisted values to check the "at least one trigger" rule
    const mergedDueDate = input.dueDate !== undefined ? input.dueDate : current.dueDate;
    const mergedDueMileage = input.dueMileage !== undefined ? input.dueMileage : current.dueMileage;

    if (mergedDueDate == null && mergedDueMileage == null) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'A reminder needs at least one trigger: dueDate or dueMileage',
        issues: [
          { code: 'validation', path: ['dueDate'], message: 'At least one trigger required' },
        ],
      });
    }

    const statusId =
      input.status !== undefined ? await this.resolveStatusId(input.status) : current.statusId;

    const updates: Partial<typeof reminders.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description ?? null;
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate ?? null;
    if (input.dueMileage !== undefined) updates.dueMileage = input.dueMileage ?? null;
    if (input.status !== undefined) updates.statusId = statusId;

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

  // --- private helpers ---

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

  /**
   * Resolve a reminder status code to its DB id, using an in-memory cache
   * populated on first call. Unknown codes throw 400 VALIDATION_ERROR.
   */
  private async resolveStatusId(code: string): Promise<number> {
    if (!this.statusIdCache) {
      await this.loadStatusCache();
    }

    const cache = this.statusIdCache;
    if (!cache) {
      throw new InternalServerErrorException('Status cache failed to load');
    }
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

  private toResponse(row: ReminderRow, currentMileage: number | null): ReminderResponse {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      title: row.title,
      description: row.description,
      dueDate: row.dueDate,
      dueMileage: row.dueMileage,
      status: row.statusCode,
      dueState: computeDueState({
        dueDate: row.dueDate,
        dueMileage: row.dueMileage,
        currentMileage,
        status: row.statusCode,
      }),
      notifiedAt: row.notifiedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Reminder not found' });
  }
}
