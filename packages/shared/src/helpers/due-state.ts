/**
 * Threshold constants and helper for computing a reminder's derived `dueState`.
 *
 * Shared between the API response transform (T-027) and the web UI display
 * (T-039) so the same thresholds apply everywhere.
 */

/** How many days before `dueDate` a reminder is considered `due_soon`. */
export const DUE_SOON_DAYS = 14;

/** How many km before `dueMileage` a reminder is considered `due_soon`. */
export const DUE_SOON_MILEAGE = 500;

export type DueState = 'overdue' | 'due_soon' | 'ok';

export interface DueStateInput {
  dueDate?: string | null;
  dueMileage?: number | null;
  currentMileage?: number | null;
  status?: string;
}

/**
 * Compute the derived `dueState` for a reminder.
 *
 * - `overdue` if `dueDate` is in the past (regardless of mileage) OR
 *   `dueMileage` ≤ `currentMileage`.
 * - `due_soon` if `dueDate` is within DUE_SOON_DAYS OR `dueMileage` is
 *   within DUE_SOON_MILEAGE of `currentMileage`.
 * - `ok` otherwise.
 *
 * Completed / dismissed reminders return `ok` regardless of date/mileage
 * since the trigger was already satisfied.
 */
export function computeDueState(input: DueStateInput): DueState {
  const { dueDate, dueMileage, currentMileage, status } = input;

  // Terminal/completed states are always ok.
  if (status && !['pending'].includes(status)) {
    return 'ok';
  }

  // Check overdue first (stronger signal).
  if (dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    // Strip time for day-level comparison
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }

  if (dueMileage != null && currentMileage != null) {
    if (currentMileage >= dueMileage) return 'overdue';
  }

  // Check due_soon
  if (dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= DUE_SOON_DAYS) return 'due_soon';
  }

  if (dueMileage != null && currentMileage != null) {
    const diff = dueMileage - currentMileage;
    if (diff >= 0 && diff <= DUE_SOON_MILEAGE) return 'due_soon';
  }

  return 'ok';
}
