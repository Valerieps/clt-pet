// Parasites and hygiene (docs/spec/cuidados.md): recurring care with a next due date.
import { isIsoDate, TEXT_MAX, type Species } from '../pets/pet';
import { addDays, DEFAULT_INTERVAL_DAYS, isValidInterval, SOON_DAYS, type VaccineStatus } from '../vaccines/vaccine';

export type CareCategory = 'parasite' | 'hygiene';
export const CARE_CATEGORIES: readonly CareCategory[] = ['parasite', 'hygiene'];
export const CARE_NOTE_MAX = 200;

export interface CareTemplate {
  readonly item: string;
  readonly intervalDays: number;
}

/** What each species comes with. The interval is a default the tutor can edit on every record. */
export const CARE_TEMPLATES: Record<CareCategory, Record<Species, readonly CareTemplate[]>> = {
  parasite: {
    cat: [
      { item: 'Vermífugo', intervalDays: 90 },
      { item: 'Antipulgas', intervalDays: 30 },
    ],
    dog: [
      { item: 'Vermífugo', intervalDays: 90 },
      { item: 'Antipulgas e carrapatos', intervalDays: 30 },
      { item: 'Coleira repelente (leishmaniose)', intervalDays: 150 },
    ],
  },
  hygiene: {
    cat: [
      { item: 'Corte de unhas', intervalDays: 30 },
      { item: 'Limpeza dos ouvidos', intervalDays: 30 },
      { item: 'Escovação dos dentes', intervalDays: 7 },
    ],
    dog: [
      { item: 'Banho', intervalDays: 15 },
      { item: 'Tosa', intervalDays: 60 },
      { item: 'Corte de unhas', intervalDays: 30 },
      { item: 'Limpeza dos ouvidos', intervalDays: 30 },
      { item: 'Escovação dos dentes', intervalDays: 7 },
    ],
  },
};

export interface CareRecord {
  readonly item: string;
  /** YYYY-MM-DD. */
  readonly doneOn: string;
  readonly intervalDays: number;
}

export const careDueDate = (record: CareRecord): string => addDays(record.doneOn, record.intervalDays);

/** How many days before the due date a record turns "soon": a quarter of the interval, from 1 to 30 days. */
export const soonWindow = (intervalDays: number): number => Math.min(SOON_DAYS, Math.max(1, Math.floor(intervalDays / 4)));

export function careStatus(record: CareRecord, today: string): VaccineStatus {
  const due = careDueDate(record);
  if (due < today) return 'overdue';
  return due <= addDays(today, soonWindow(record.intervalDays)) ? 'soon' : 'ok';
}

const sameItem = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The latest record of each item (ties: the last one given), in the order the items first appear. */
export function currentCare<T extends CareRecord>(records: readonly T[]): T[] {
  const latest: T[] = [];
  for (const record of records) {
    const index = latest.findIndex((r) => sameItem(r.item, record.item));
    if (index < 0) latest.push(record);
    else if (record.doneOn >= latest[index].doneOn) latest[index] = record;
  }
  return latest;
}

export interface CareInput {
  readonly category: CareCategory;
  readonly item: string;
  readonly doneOn: string;
  readonly intervalDays: number;
  readonly note: string | null;
}

/** The category, the item and the date are required; the date cannot be in the future. Null when invalid. */
export function normalizeCare(raw: Record<string, unknown>, today: string): CareInput | null {
  if (!CARE_CATEGORIES.includes(raw.category as CareCategory)) return null;
  if (typeof raw.item !== 'string') return null;
  const item = raw.item.trim();
  if (item === '' || item.length > TEXT_MAX) return null;
  if (typeof raw.doneOn !== 'string' || !isIsoDate(raw.doneOn) || raw.doneOn > today) return null;
  const intervalDays = raw.intervalDays === undefined ? DEFAULT_INTERVAL_DAYS : raw.intervalDays;
  if (!isValidInterval(intervalDays)) return null;
  let note: string | null = null;
  if (raw.note !== undefined && raw.note !== null) {
    if (typeof raw.note !== 'string') return null;
    note = raw.note.trim() === '' ? null : raw.note.trim();
    if (note !== null && note.length > CARE_NOTE_MAX) return null;
  }
  return { category: raw.category as CareCategory, item, doneOn: raw.doneOn, intervalDays, note };
}
