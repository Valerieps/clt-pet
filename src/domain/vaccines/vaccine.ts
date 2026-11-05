// The vaccination card (docs/spec/vacinas.md): protocols per species, the booster date and the status.
import { isIsoDate, TEXT_MAX, type Species } from '../pets/pet';

export const DEFAULT_INTERVAL_DAYS = 365;
export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 3650;
export const SOON_DAYS = 30;

/** The vaccines each species comes with. The booster interval is a default the tutor can edit. */
export const PROTOCOLS: Record<Species, readonly string[]> = {
  cat: ['V4', 'V5', 'Antirrábica', 'FeLV'],
  dog: ['V8', 'V10', 'Antirrábica', 'Gripe (tosse dos canis)', 'Giárdia', 'Leishmaniose'],
};

export type VaccineStatus = 'ok' | 'soon' | 'overdue';

export interface Dose {
  readonly vaccine: string;
  /** YYYY-MM-DD. */
  readonly appliedOn: string;
  readonly intervalDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export const boosterDate = (dose: Dose): string => addDays(dose.appliedOn, dose.intervalDays);

/** Overdue once the booster date has passed; "soon" from 30 days before it (the due day included). */
export function vaccineStatus(dose: Dose, today: string): VaccineStatus {
  const due = boosterDate(dose);
  if (due < today) return 'overdue';
  return due <= addDays(today, SOON_DAYS) ? 'soon' : 'ok';
}

const sameVaccine = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The latest dose of each vaccine (ties: the last one given), in the order the vaccines first appear. */
export function currentDoses<T extends Dose>(doses: readonly T[]): T[] {
  const latest: T[] = [];
  for (const dose of doses) {
    const index = latest.findIndex((d) => sameVaccine(d.vaccine, dose.vaccine));
    if (index < 0) latest.push(dose);
    else if (dose.appliedOn >= latest[index].appliedOn) latest[index] = dose;
  }
  return latest;
}

export const isValidInterval = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= MIN_INTERVAL_DAYS && value <= MAX_INTERVAL_DAYS;

export interface DoseInput {
  readonly vaccine: string;
  readonly appliedOn: string;
  readonly intervalDays: number;
  readonly lot: string | null;
  readonly maker: string | null;
  readonly vet: string | null;
}

function optionalText(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length > TEXT_MAX) return undefined;
  return trimmed === '' ? null : trimmed;
}

/** Only the vaccine and the date are required; a date in the future is refused. Null when invalid. */
export function normalizeDose(raw: Record<string, unknown>, today: string): DoseInput | null {
  if (typeof raw.vaccine !== 'string') return null;
  const vaccine = raw.vaccine.trim();
  if (vaccine === '' || vaccine.length > TEXT_MAX) return null;
  if (typeof raw.appliedOn !== 'string' || !isIsoDate(raw.appliedOn) || raw.appliedOn > today) return null;
  const intervalDays = raw.intervalDays === undefined ? DEFAULT_INTERVAL_DAYS : raw.intervalDays;
  if (!isValidInterval(intervalDays)) return null;
  const lot = optionalText(raw.lot);
  const maker = optionalText(raw.maker);
  const vet = optionalText(raw.vet);
  if (lot === undefined || maker === undefined || vet === undefined) return null;
  return { vaccine, appliedOn: raw.appliedOn, intervalDays, lot, maker, vet };
}
