/**
 * Shared reminder due-date helpers.
 */

/** How many days before a due date a reminder is considered due soon. */
export const DUE_SOON_DAYS = 14;

/** How many km before a due mileage a reminder is considered due soon. */
export const DUE_SOON_MILEAGE = 500;

export const REMINDER_MODES = ['one_off', 'recurring'] as const;

export type ReminderMode = (typeof REMINDER_MODES)[number];
export type DueState = 'overdue' | 'due_soon' | 'ok';

export interface ReminderDueInput {
  mode?: ReminderMode;
  dueDate?: string | null;
  dueMileage?: number | null;
  intervalKm?: number | null;
  intervalMonths?: number | null;
  lastPerformedDate?: string | null;
  lastPerformedMileage?: number | null;
}

export interface ReminderDueTargets {
  nextDueDate: string | null;
  nextDueMileage: number | null;
}

export interface DueStateInput extends ReminderDueInput {
  currentMileage?: number | null;
  status?: string;
  nextDueDate?: string | null;
  nextDueMileage?: number | null;
}

function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1 + months, day ?? 1));
  return result.toISOString().slice(0, 10);
}

export function computeNextDueTargets(input: ReminderDueInput): ReminderDueTargets {
  if ((input.mode ?? 'one_off') === 'one_off') {
    return {
      nextDueDate: input.dueDate ?? null,
      nextDueMileage: input.dueMileage ?? null,
    };
  }

  return {
    nextDueDate:
      input.intervalMonths != null && input.lastPerformedDate
        ? addMonths(input.lastPerformedDate, input.intervalMonths)
        : null,
    nextDueMileage:
      input.intervalKm != null && input.lastPerformedMileage != null
        ? input.lastPerformedMileage + input.intervalKm
        : null,
  };
}

export function computeDueState(input: DueStateInput): DueState {
  const { currentMileage, status } = input;

  if (status && status !== 'pending') {
    return 'ok';
  }

  const targets = {
    nextDueDate: input.nextDueDate ?? computeNextDueTargets(input).nextDueDate,
    nextDueMileage: input.nextDueMileage ?? computeNextDueTargets(input).nextDueMileage,
  };

  if (targets.nextDueDate) {
    const today = new Date();
    const due = new Date(targets.nextDueDate);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }

  if (
    targets.nextDueMileage != null &&
    currentMileage != null &&
    currentMileage >= targets.nextDueMileage
  ) {
    return 'overdue';
  }

  if (targets.nextDueDate) {
    const today = new Date();
    const due = new Date(targets.nextDueDate);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= DUE_SOON_DAYS) return 'due_soon';
  }

  if (targets.nextDueMileage != null && currentMileage != null) {
    const diff = targets.nextDueMileage - currentMileage;
    if (diff >= 0 && diff <= DUE_SOON_MILEAGE) return 'due_soon';
  }

  return 'ok';
}
