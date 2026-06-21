import { chargingSessions, fuelLogs, fuelTypes, vehicles, type Db } from '@carnotea/db';
import {
  type ApiIssue,
  type Vehicle,
  type VehicleCreate,
  type VehicleUpdate,
  type FuelTypeCode,
} from '@carnotea/shared';
import {
  BadRequestException,
  ConflictException,
  type HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';

// Read projection shared by every read path: the vehicle row joined with its
// fuel-type lookup so the API exposes the stable `fuelType` code instead of the
// internal `fuelTypeId`.
const vehicleSelection = {
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
};

interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  generation: string | null;
  productionYear: number;
  engine: string | null;
  fuelType: string;
  vin: string | null;
  registrationNumber: string | null;
  currentMileage: number;
  currencyCode: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VehicleEnergySourceState {
  hasFuelLogs: boolean;
  hasChargingSessions: boolean;
}

const ICE_ONLY_FUEL_TYPES = new Set<FuelTypeCode>(['petrol', 'diesel', 'lpg']);

export function vehicleEnergySourceIssue(
  targetFuelType: FuelTypeCode,
  state: VehicleEnergySourceState,
): ApiIssue | null {
  if (targetFuelType === 'electric' && state.hasFuelLogs) {
    return {
      code: 'invalid_energy_source',
      path: ['fuelType'],
      message: 'A vehicle with fuel logs cannot be changed to electric.',
    };
  }

  if (ICE_ONLY_FUEL_TYPES.has(targetFuelType) && state.hasChargingSessions) {
    return {
      code: 'invalid_energy_source',
      path: ['fuelType'],
      message: 'A vehicle with charging sessions cannot be changed to an ICE-only fuel type.',
    };
  }

  return null;
}

/**
 * Postgres unique-violation (SQLSTATE 23505) → the violated constraint name.
 * Drizzle wraps the driver error in a `DrizzleQueryError`, so the real
 * `PostgresError` (carrying `code`/`constraint_name`) is reached via `cause`.
 */
function uniqueViolationConstraint(error: unknown): string | undefined {
  let current = error;
  while (typeof current === 'object' && current !== null) {
    const record = current as Record<string, unknown>;
    if (record.code === '23505') {
      return typeof record.constraint_name === 'string' ? record.constraint_name : '';
    }
    current = record.cause;
  }
  return undefined;
}

@Injectable()
export class VehiclesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(userId: string): Promise<Vehicle[]> {
    const rows = await this.db
      .select(vehicleSelection)
      .from(vehicles)
      .innerJoin(fuelTypes, eq(vehicles.fuelTypeId, fuelTypes.id))
      .where(eq(vehicles.userId, userId))
      .orderBy(desc(vehicles.createdAt));
    return rows.map((row) => this.toContract(row));
  }

  async getOwnedOrThrow(userId: string, id: string): Promise<Vehicle> {
    const rows = await this.db
      .select(vehicleSelection)
      .from(vehicles)
      .innerJoin(fuelTypes, eq(vehicles.fuelTypeId, fuelTypes.id))
      .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)))
      .limit(1);
    const row = rows.at(0);
    if (!row) {
      throw this.notFound();
    }
    return this.toContract(row);
  }

  async create(userId: string, input: VehicleCreate): Promise<Vehicle> {
    const fuelTypeId = await this.resolveFuelTypeId(input.fuelType);

    let inserted: { id: string }[];
    try {
      inserted = await this.db
        .insert(vehicles)
        .values({
          userId,
          brand: input.brand,
          model: input.model,
          generation: input.generation ?? null,
          productionYear: input.productionYear,
          engine: input.engine ?? null,
          fuelTypeId,
          vin: input.vin ?? null,
          registrationNumber: input.registrationNumber ?? null,
          currencyCode: input.currencyCode,
        })
        .returning({ id: vehicles.id });
    } catch (error) {
      throw this.writeException(error);
    }

    const created = inserted.at(0);
    if (!created) {
      throw new InternalServerErrorException('Vehicle insert returned no row');
    }
    return this.getOwnedOrThrow(userId, created.id);
  }

  async update(userId: string, id: string, input: VehicleUpdate): Promise<Vehicle> {
    const updates: Partial<typeof vehicles.$inferInsert> = {};
    if (input.brand !== undefined) updates.brand = input.brand;
    if (input.model !== undefined) updates.model = input.model;
    if (input.generation !== undefined) updates.generation = input.generation;
    if (input.productionYear !== undefined) updates.productionYear = input.productionYear;
    if (input.engine !== undefined) updates.engine = input.engine;
    if (input.fuelType !== undefined) {
      const current = await this.getOwnedOrThrow(userId, id);
      if (current.fuelType !== input.fuelType) {
        await this.assertFuelTypeChangeAllowed(id, input.fuelType);
      }
      updates.fuelTypeId = await this.resolveFuelTypeId(input.fuelType);
    }
    if (input.vin !== undefined) updates.vin = input.vin;
    if (input.registrationNumber !== undefined) {
      updates.registrationNumber = input.registrationNumber;
    }
    if (input.currencyCode !== undefined) updates.currencyCode = input.currencyCode;
    updates.updatedAt = new Date();

    let affected: { id: string }[];
    try {
      affected = await this.db
        .update(vehicles)
        .set(updates)
        .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)))
        .returning({ id: vehicles.id });
    } catch (error) {
      throw this.writeException(error);
    }

    if (affected.length === 0) {
      throw this.notFound();
    }
    return this.getOwnedOrThrow(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.db
      .delete(vehicles)
      .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)))
      .returning({ id: vehicles.id });
    if (deleted.length === 0) {
      throw this.notFound();
    }
  }

  private async assertFuelTypeChangeAllowed(
    vehicleId: string,
    targetFuelType: FuelTypeCode,
  ): Promise<void> {
    const [existingFuelLogs, existingChargingSessions] = await Promise.all([
      this.db
        .select({ id: fuelLogs.id })
        .from(fuelLogs)
        .where(eq(fuelLogs.vehicleId, vehicleId))
        .limit(1),
      this.db
        .select({ id: chargingSessions.id })
        .from(chargingSessions)
        .where(eq(chargingSessions.vehicleId, vehicleId))
        .limit(1),
    ]);

    const issue = vehicleEnergySourceIssue(targetFuelType, {
      hasFuelLogs: existingFuelLogs.length > 0,
      hasChargingSessions: existingChargingSessions.length > 0,
    });

    if (issue) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Vehicle fuel type conflicts with existing entries.',
        issues: [issue],
      });
    }
  }

  private async resolveFuelTypeId(code: FuelTypeCode): Promise<number> {
    const rows = await this.db
      .select({ id: fuelTypes.id })
      .from(fuelTypes)
      .where(eq(fuelTypes.code, code))
      .limit(1);
    const found = rows.at(0);
    if (!found) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `Unknown fuel type: ${code}`,
      });
    }
    return found.id;
  }

  private toContract(row: VehicleRow): Vehicle {
    return {
      id: row.id,
      brand: row.brand,
      model: row.model,
      generation: row.generation,
      productionYear: row.productionYear,
      engine: row.engine,
      fuelType: row.fuelType as FuelTypeCode,
      vin: row.vin,
      registrationNumber: row.registrationNumber,
      currentMileage: row.currentMileage,
      currencyCode: row.currencyCode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'Vehicle not found' });
  }

  private writeException(error: unknown): HttpException | Error {
    const constraint = uniqueViolationConstraint(error);
    if (constraint !== undefined) {
      const field = constraint.includes('registration') ? 'registrationNumber' : 'vin';
      const label = field === 'vin' ? 'VIN' : 'registration number';
      return new ConflictException({
        code: 'CONFLICT',
        message: `A vehicle with this ${label} already exists.`,
        issues: [{ code: 'conflict', path: [field], message: 'Must be unique.' }],
      });
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
