// A pet's weight (docs/spec/pets.md, "Peso"). Weights are whole grams.
import { isIsoDate } from './pet';

export const MIN_GRAMS = 100;
export const MAX_GRAMS = 150_000;
export const DEFAULT_ALERT_PERCENT = 10;
export const ALERT_WINDOW_DAYS = 60;
export const MIN_ALERT_PERCENT = 1;
export const MAX_ALERT_PERCENT = 50;

export interface WeightPoint {
  readonly grams: number;
  /** YYYY-MM-DD. */
  readonly onDate: string;
}

export interface WeightAlert {
  /** Signed: negative means the pet lost weight. */
  readonly percent: number;
  readonly fromGrams: number;
  readonly fromDate: string;
  readonly toGrams: number;
  readonly toDate: string;
}

export function isValidGrams(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_GRAMS && value <= MAX_GRAMS;
}

export function isValidWeightDate(value: unknown, today: string): value is string {
  return typeof value === 'string' && isIsoDate(value) && value <= today;
}

export function isValidAlertPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_ALERT_PERCENT && value <= MAX_ALERT_PERCENT;
}

/** "4,2" or "4.2" kilos → 4200 grams; null when it is not a plausible weight. */
export function parseKilos(input: string): number | null {
  const clean = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(clean)) return null;
  const grams = Math.round(Number(clean) * 1000);
  return isValidGrams(grams) ? grams : null;
}

export function formatKilos(grams: number): string {
  return `${(grams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/** The newest weight by date (ties: the last one given). */
export function latestWeight<T extends WeightPoint>(points: readonly T[]): T | null {
  let latest: T | null = null;
  for (const point of points) if (!latest || point.onDate >= latest.onDate) latest = point;
  return latest;
}

/**
 * Compares the newest weight with the others from the 60 days before it and reports the biggest
 * change when it reaches `thresholdPercent`. Neutral by design: it only states the numbers.
 */
export function weightAlert(points: readonly WeightPoint[], thresholdPercent: number): WeightAlert | null {
  const latest = latestWeight(points);
  if (!latest) return null;
  let best: WeightAlert | null = null;
  for (const earlier of points) {
    if (earlier === latest || earlier.onDate > latest.onDate) continue;
    if (daysBetween(earlier.onDate, latest.onDate) > ALERT_WINDOW_DAYS) continue;
    const percent = ((latest.grams - earlier.grams) / earlier.grams) * 100;
    if (Math.abs(percent) < thresholdPercent) continue;
    if (!best || Math.abs(percent) > Math.abs(best.percent)) {
      best = { percent, fromGrams: earlier.grams, fromDate: earlier.onDate, toGrams: latest.grams, toDate: latest.onDate };
    }
  }
  return best;
}
