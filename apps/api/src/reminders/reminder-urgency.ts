import {
  computeDueState,
  computeNextDueTargets,
  DUE_SOON_DAYS,
  DUE_SOON_MILEAGE,
  type DueState,
  type ReminderMode,
} from '@carnotea/shared';

export interface ReminderUrgencyInput {
  mode?: ReminderMode;
  dueDate?: string | null;
  dueMileage?: number | null;
  intervalKm?: number | null;
  intervalMonths?: number | null;
  lastPerformedDate?: string | null;
  lastPerformedMileage?: number | null;
  currentMileage?: number | null;
  status?: string;
}

export interface ReminderUrgency {
  nextDueDate: string | null;
  nextDueMileage: number | null;
  dueInKm: number | null;
  dueInDays: number | null;
  dueState: DueState;
}

export function computeReminderUrgency(input: ReminderUrgencyInput): ReminderUrgency {
  const targets = computeNextDueTargets(input);
  const dueState = computeDueState({
    ...input,
    nextDueDate: targets.nextDueDate,
    nextDueMileage: targets.nextDueMileage,
  });

  let dueInDays: number | null = null;
  if (targets.nextDueDate) {
    const today = new Date();
    const due = new Date(targets.nextDueDate);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    dueInDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  const dueInKm =
    targets.nextDueMileage != null && input.currentMileage != null
      ? targets.nextDueMileage - input.currentMileage
      : null;

  return {
    nextDueDate: targets.nextDueDate,
    nextDueMileage: targets.nextDueMileage,
    dueInKm,
    dueInDays,
    dueState,
  };
}

function urgencyRank(urgency: ReminderUrgency): number {
  if (urgency.dueState === 'overdue') return 0;
  if (urgency.dueState === 'due_soon') return 1;
  return 2;
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

export function compareReminderUrgency(a: ReminderUrgencyInput, b: ReminderUrgencyInput): number {
  const urgencyA = computeReminderUrgency(a);
  const urgencyB = computeReminderUrgency(b);

  const rankDiff = urgencyRank(urgencyA) - urgencyRank(urgencyB);
  if (rankDiff !== 0) return rankDiff;

  const dayDiff = compareNullableNumbers(urgencyA.dueInDays, urgencyB.dueInDays);
  if (dayDiff !== 0) return dayDiff;

  const kmDiff = compareNullableNumbers(urgencyA.dueInKm, urgencyB.dueInKm);
  if (kmDiff !== 0) return kmDiff;

  if (
    urgencyA.nextDueDate &&
    urgencyB.nextDueDate &&
    urgencyA.nextDueDate !== urgencyB.nextDueDate
  ) {
    return urgencyA.nextDueDate < urgencyB.nextDueDate ? -1 : 1;
  }

  if (urgencyA.nextDueMileage != null && urgencyB.nextDueMileage != null) {
    return urgencyA.nextDueMileage - urgencyB.nextDueMileage;
  }

  return 0;
}

export { DUE_SOON_DAYS, DUE_SOON_MILEAGE };
