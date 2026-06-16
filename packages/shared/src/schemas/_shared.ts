import { z } from 'zod';

/**
 * Field-level helpers shared across the domain schemas. They encode the column
 * conventions from `packages/db/src/schema` once so every entity mirrors the DB
 * the same way (see `packages/shared/AGENTS.md` § Schema-per-entity).
 */

/** Primary keys and foreign keys are `uuid` columns. */
export const uuidField = () => z.uuid();

/** `date` columns hold a calendar day with no time component. */
export const dateField = () => z.iso.date();

/** `timestamp({ withTimezone: true })` columns serialize as ISO date-times. */
export const timestampField = () => z.iso.datetime({ offset: true });

/**
 * `numeric(p, s)` columns are read back from Postgres as strings, so decimal
 * fields accept both stringified and real numbers via coercion. This is the one
 * decimal convention applied everywhere (ticket T-019 implementation note).
 */
export const decimalField = () => z.coerce.number();

/** A non-negative money amount stored in a `numeric` column. */
export const moneyField = () => decimalField().nonnegative();

/** A strictly positive `numeric` quantity (liters, kWh, part quantity). */
export const positiveDecimalField = () => decimalField().positive();

/** `integer` mileage / odometer columns are constrained to `>= 0` in the DB. */
export const mileageField = () => z.number().int().nonnegative();

/** State-of-charge `smallint` columns are bounded `0..100`. */
export const socPercentField = () => z.number().int().min(0).max(100);

/** `currency_code varchar(3)` columns store a 3-character ISO 4217 code. */
export const currencyCodeField = () => z.string().length(3).toUpperCase();
