// The daily routine: the pet's diary and the meals (docs/spec/saude.md and the meals in docs/spec/pets.md).
import { optionalText } from '../health/health';
import { isIsoDate, TEXT_MAX } from '../pets/pet';

export const DIARY_MAX = 500;

export interface DiaryInput {
  readonly onDate: string;
  readonly text: string;
}

/** The text is required; the date defaults to today and cannot be in the future. Null when invalid. */
export function normalizeDiary(raw: Record<string, unknown>, today: string): DiaryInput | null {
  if (typeof raw.text !== 'string') return null;
  const text = raw.text.trim();
  if (text === '' || text.length > DIARY_MAX) return null;
  const onDate = raw.onDate === undefined || raw.onDate === null ? today : raw.onDate;
  if (typeof onDate !== 'string' || !isIsoDate(onDate) || onDate > today) return null;
  return { onDate, text };
}

export interface MealInput {
  /** HH:MM, 24 hours. */
  readonly at: string;
  readonly amount: string | null;
  readonly note: string | null;
}

export const isValidTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Only the time is required. Null when invalid. */
export function normalizeMeal(raw: Record<string, unknown>): MealInput | null {
  if (!isValidTime(raw.at)) return null;
  const amount = optionalText(raw.amount, TEXT_MAX);
  const note = optionalText(raw.note, TEXT_MAX);
  if (amount === undefined || note === undefined) return null;
  return { at: raw.at, amount, note };
}
