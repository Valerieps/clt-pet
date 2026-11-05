// When a reminder is due (docs/spec/lembretes.md). Pure: the server passes the clock and the items.

/** The hour of the day (Brasília) when the day's reminders go out. */
export const REMINDER_HOUR = 9;

/** The stages of one due date: 30 and 7 days before, the day itself, and 24 h later for the reserva. */
export type ReminderStage = '30d' | '7d' | 'due' | 'escalated';

/** Brasília has no daylight saving time since 2019: it is always UTC-3. */
const BRASILIA_OFFSET_HOURS = -3;

export interface BrasiliaTime {
  /** YYYY-MM-DD. */
  readonly date: string;
  readonly hour: number;
}

export function brasiliaTime(now: Date): BrasiliaTime {
  const shifted = new Date(now.getTime() + BRASILIA_OFFSET_HOURS * 3_600_000);
  return { date: shifted.toISOString().slice(0, 10), hour: shifted.getUTCHours() };
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * The stages due for an item whose due date is `dueOn`, at `now`. Nothing goes out before
 * REMINDER_HOUR. Only the stage the date is in counts: a "30 days" notice that would arrive 3 days
 * before the date is noise, so earlier stages that were missed are skipped. Past the date, the
 * "due" notice is still owed if it never went out, and the reserva is warned from the next day on.
 */
export function dueStages(dueOn: string, now: Date): ReminderStage[] {
  const today = brasiliaTime(now);
  if (today.hour < REMINDER_HOUR) return [];
  const daysLeft = daysBetween(today.date, dueOn);
  if (daysLeft > 30) return [];
  if (daysLeft > 7) return ['30d'];
  if (daysLeft > 0) return ['7d'];
  if (daysLeft === 0) return ['due'];
  return ['due', 'escalated'];
}

/** The number the notice says: days left before the date, days late after it. */
export function daysFor(dueOn: string, now: Date): number {
  return Math.abs(daysBetween(brasiliaTime(now).date, dueOn));
}
