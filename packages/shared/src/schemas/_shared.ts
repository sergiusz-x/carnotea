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
 * The largest value a `numeric(precision, 2)` column can hold, e.g.
 * `numeric(8, 2)` → `999999.99`, `numeric(10, 2)` → `99999999.99`.
 */
const decimalMax = (precision: number) => 10 ** (precision - 2) - 0.01;

/**
 * `numeric(precision, 2)` columns are read back from Postgres as strings, so
 * decimal fields accept both stringified and real numbers via coercion (the one
 * decimal convention applied everywhere — ticket T-019 implementation note) and
 * are bounded to the column's precision. Defaults to `numeric(10, 2)`.
 */
export const decimalField = (precision = 10) => z.coerce.number().max(decimalMax(precision));

/** A non-negative money amount stored in a `numeric(precision, 2)` column. */
export const moneyField = (precision = 10) => decimalField(precision).nonnegative();

/** A strictly positive `numeric(precision, 2)` quantity (liters, kWh, parts). */
export const positiveDecimalField = (precision = 10) => decimalField(precision).positive();

/** `integer` mileage / odometer columns are constrained to `>= 0` in the DB. */
export const mileageField = () => z.number().int().nonnegative();

/** State-of-charge `smallint` columns are bounded `0..100`. */
export const socPercentField = () => z.number().int().min(0).max(100);

/** `currency_code varchar(3)` columns store a 3-character ISO 4217 code. */
export const currencyCodeField = () => z.string().length(3).toUpperCase();
