import { issues, issueStatuses, issuePriorities, vehicles, type Db } from '@carnotea/db';
import { type IssueCreate, type IssueUpdate } from '@carnotea/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';

export interface IssueResponse {
  id: string;
  vehicleId: string;
  reportedDate: string;
  resolvedDate: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  relatedServiceRecordId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IssueRow {
  id: string;
  vehicleId: string;
  reportedDate: string;
  resolvedDate: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  relatedServiceRecordId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Cached code→id map for issue statuses, loaded once at first use. */
let statusCodeToId: Record<string, number> | null = null;
let priorityCodeToId: Record<string, number> | null = null;

@Injectable()
export class IssuesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(
    userId: string,
    vehicleId: string,
    filters?: { status?: string; priority?: string },
  ): Promise<IssueResponse[]> {
    await this.assertVehicleOwned(userId, vehicleId);

    const conditions = [eq(issues.vehicleId, vehicleId)];
    if (filters?.status) {
      conditions.push(eq(issueStatuses.code, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(issuePriorities.code, filters.priority));
    }

    const rows = await this.db
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
      .where(and(...conditions))
      .orderBy(desc(issues.reportedDate), desc(issues.createdAt));

    return rows.map((row) => this.toResponse(row));
  }

  async getOwnedOrThrow(userId: string, vehicleId: string, id: string): Promise<IssueResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const rows = await this.db
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
      .where(and(eq(issues.id, id), eq(issues.vehicleId, vehicleId)))
      .limit(1);

    const row = rows.at(0);
    if (!row) throw this.notFound();

    return this.toResponse(row);
  }

  async create(userId: string, vehicleId: string, input: IssueCreate): Promise<IssueResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    const statusId = await this.resolveStatusId(input.status);
    const priorityId = await this.resolvePriorityId(input.priority);

    // Enforce resolved-date invariant at the service layer:
    // resolved status → always set a resolvedDate if not provided
    // non-resolved status → never persist a resolvedDate
    const resolvedDate =
      input.status === 'resolved' ? (input.resolvedDate ?? input.reportedDate) : undefined;

    const values: Record<string, unknown> = {
      vehicleId,
      reportedDate: input.reportedDate,
      title: input.title,
      statusId,
      priorityId,
    };

    if (resolvedDate !== undefined) {
      values.resolvedDate = resolvedDate;
    }
    if (input.description !== undefined) {
      values.description = input.description;
    }
    if (input.relatedServiceRecordId !== undefined && input.relatedServiceRecordId !== null) {
      // Validate the related service record belongs to the same vehicle
      await this.assertServiceRecordOnVehicle(input.relatedServiceRecordId, vehicleId);
      values.relatedServiceRecordId = input.relatedServiceRecordId;
    }

    const inserted = await this.db
      .insert(issues)
      .values(values as typeof issues.$inferInsert)
      .returning({ id: issues.id });

    const created = inserted.at(0);
    if (!created) throw new Error('Issue insert returned no row');

    return this.getOwnedOrThrow(userId, vehicleId, created.id);
  }

  async update(
    userId: string,
    vehicleId: string,
    id: string,
    input: IssueUpdate,
  ): Promise<IssueResponse> {
    await this.assertVehicleOwned(userId, vehicleId);

    // Fetch current state to determine status transitions
    const currentRows = await this.db
      .select({
        id: issues.id,
        statusId: issues.statusId,
        statusCode: issueStatuses.code,
        resolvedDate: issues.resolvedDate,
      })
      .from(issues)
      .innerJoin(issueStatuses, eq(issues.statusId, issueStatuses.id))
      .where(and(eq(issues.id, id), eq(issues.vehicleId, vehicleId)))
      .limit(1);

    const current = currentRows.at(0);
    if (!current) throw this.notFound();

    const updates: Record<string, unknown> = {};

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.priority !== undefined) {
      updates.priorityId = await this.resolvePriorityId(input.priority);
    }

    // Determine the effective status after update
    let effectiveResolvedDate: string | null | undefined;

    if (input.resolvedDate !== undefined) {
      effectiveResolvedDate = input.resolvedDate;
    } else {
      effectiveResolvedDate = current.resolvedDate;
    }

    if (input.status !== undefined) {
      updates.statusId = await this.resolveStatusId(input.status);

      // Status transition: if moving to resolved, ensure resolvedDate is set
      if (input.status === 'resolved' && current.statusCode !== 'resolved') {
        effectiveResolvedDate = effectiveResolvedDate ?? new Date().toISOString().split('T')[0];
      }

      // Status transition: if moving away from resolved, clear resolvedDate
      if (current.statusCode === 'resolved' && input.status !== 'resolved') {
        effectiveResolvedDate = null;
      }
    }

    if (effectiveResolvedDate !== undefined) {
      updates.resolvedDate = effectiveResolvedDate;
    }

    if (input.relatedServiceRecordId !== undefined) {
      if (input.relatedServiceRecordId !== null) {
        await this.assertServiceRecordOnVehicle(input.relatedServiceRecordId, vehicleId);
      }
      updates.relatedServiceRecordId = input.relatedServiceRecordId;
    }

    updates.updatedAt = sql`now()`;

    const affected = await this.db
      .update(issues)
      .set(updates as Partial<typeof issues.$inferInsert>)
      .where(and(eq(issues.id, id), eq(issues.vehicleId, vehicleId)))
      .returning({ id: issues.id });

    if (affected.length === 0) throw this.notFound();

    return this.getOwnedOrThrow(userId, vehicleId, id);
  }

  async remove(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.assertVehicleOwned(userId, vehicleId);

    const deleted = await this.db
      .delete(issues)
      .where(and(eq(issues.id, id), eq(issues.vehicleId, vehicleId)))
      .returning({ id: issues.id });

    if (deleted.length === 0) throw this.notFound();
  }

  // ---- internal ----

  private async assertVehicleOwned(userId: string, vehicleId: string): Promise<void> {
    const rows = await this.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)))
      .limit(1);
    if (!rows.at(0)) throw this.notFound();
  }

  private async assertServiceRecordOnVehicle(
    serviceRecordId: string,
    vehicleId: string,
  ): Promise<void> {
    const { serviceRecords } = await import('@carnotea/db');
    const rows = await this.db
      .select({ id: serviceRecords.id })
      .from(serviceRecords)
      .where(and(eq(serviceRecords.id, serviceRecordId), eq(serviceRecords.vehicleId, vehicleId)))
      .limit(1);
    if (!rows.at(0)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Service record not found on this vehicle',
      });
    }
  }

  private async resolveStatusId(code: string): Promise<number> {
    const map = statusCodeToId ?? (await this.loadStatusMap());
    const id = map[code];
    if (id === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Unknown issue status: ${code}`,
      });
    }
    return id;
  }

  private async resolvePriorityId(code: string): Promise<number> {
    const map = priorityCodeToId ?? (await this.loadPriorityMap());
    const id = map[code];
    if (id === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Unknown issue priority: ${code}`,
      });
    }
    return id;
  }

  private async loadStatusMap(): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ id: issueStatuses.id, code: issueStatuses.code })
      .from(issueStatuses);
    statusCodeToId = Object.fromEntries(rows.map((r) => [r.code, r.id]));
    return statusCodeToId;
  }

  private async loadPriorityMap(): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ id: issuePriorities.id, code: issuePriorities.code })
      .from(issuePriorities);
    priorityCodeToId = Object.fromEntries(rows.map((r) => [r.code, r.id]));
    return priorityCodeToId;
  }

  private toResponse(row: IssueRow): IssueResponse {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      reportedDate: row.reportedDate,
      resolvedDate: row.resolvedDate,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      relatedServiceRecordId: row.relatedServiceRecordId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Issue not found' });
  }
}
