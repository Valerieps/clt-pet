// A chefe's medications (docs/spec/medicacoes.md): what is given, how often, from when to when.
import { isIsoDate, TEXT_MAX } from '../pets/pet';

export const FREQUENCIES = ['daily1', 'daily2', 'daily3', 'every12h', 'every8h', 'asNeeded'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const isFrequency = (value: unknown): value is Frequency => FREQUENCIES.includes(value as Frequency);

export interface MedicationInput {
  readonly name: string;
  readonly dose: string;
  readonly frequency: Frequency;
  /** YYYY-MM-DD. */
  readonly startOn: string;
  /** YYYY-MM-DD; null is continuous use. */
  readonly endOn: string | null;
}

/** Name, dose, frequency and the start date are required; the end date, when given, is not before the start. Null when invalid. */
export function normalizeMedication(raw: Record<string, unknown>): MedicationInput | null {
  if (typeof raw.name !== 'string' || typeof raw.dose !== 'string') return null;
  const name = raw.name.trim();
  const dose = raw.dose.trim();
  if (name === '' || name.length > TEXT_MAX || dose === '' || dose.length > TEXT_MAX) return null;
  if (!isFrequency(raw.frequency)) return null;
  if (typeof raw.startOn !== 'string' || !isIsoDate(raw.startOn)) return null;
  const end = raw.endOn === undefined || raw.endOn === '' ? null : raw.endOn;
  if (end !== null && (typeof end !== 'string' || !isIsoDate(end) || end < raw.startOn)) return null;
  return { name, dose, frequency: raw.frequency, startOn: raw.startOn, endOn: end };
}

/** Ended once the end date has passed (the end day itself still counts as in use). */
export const isEnded = (medication: { readonly endOn: string | null }, today: string): boolean =>
  medication.endOn !== null && medication.endOn < today;
