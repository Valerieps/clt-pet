// Health conditions, consultations, exams and reports (docs/spec/saude.md).
import { isIsoDate, TEXT_MAX } from '../pets/pet';

export const NOTES_MAX = 1000;
export type VisitKind = 'consulta' | 'exame' | 'laudo';
export const VISIT_KINDS: readonly VisitKind[] = ['consulta', 'exame', 'laudo'];

/** Optional trimmed text: null when empty, undefined when not text or too long. */
export function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  if (clean === '') return null;
  return clean.length <= max ? clean : undefined;
}

export interface ConditionInput {
  readonly name: string;
  readonly grave: boolean;
  readonly since: string | null;
  readonly notes: string | null;
}

/** Only the name is required. `since` cannot be in the future. Null when invalid. */
export function normalizeCondition(raw: Record<string, unknown>, today: string): ConditionInput | null {
  if (typeof raw.name !== 'string') return null;
  const name = raw.name.trim();
  if (name === '' || name.length > TEXT_MAX) return null;
  if (raw.grave !== undefined && typeof raw.grave !== 'boolean') return null;
  let since: string | null = null;
  if (raw.since !== undefined && raw.since !== null && raw.since !== '') {
    if (typeof raw.since !== 'string' || !isIsoDate(raw.since) || raw.since > today) return null;
    since = raw.since;
  }
  const notes = optionalText(raw.notes, NOTES_MAX);
  if (notes === undefined) return null;
  return { name, grave: raw.grave === true, since, notes };
}

export interface VisitInput {
  readonly kind: VisitKind;
  readonly onDate: string;
  readonly title: string;
  readonly vet: string | null;
  readonly notes: string | null;
  readonly returnOn: string | null;
}

/**
 * A consulta may be scheduled (a future date); an exame or laudo is already done. The return date
 * cannot come before the visit. Null when invalid.
 */
export function normalizeVisit(raw: Record<string, unknown>, today: string): VisitInput | null {
  if (!VISIT_KINDS.includes(raw.kind as VisitKind)) return null;
  const kind = raw.kind as VisitKind;
  if (typeof raw.title !== 'string') return null;
  const title = raw.title.trim();
  if (title === '' || title.length > TEXT_MAX) return null;
  if (typeof raw.onDate !== 'string' || !isIsoDate(raw.onDate)) return null;
  if (kind !== 'consulta' && raw.onDate > today) return null;
  let returnOn: string | null = null;
  if (raw.returnOn !== undefined && raw.returnOn !== null && raw.returnOn !== '') {
    if (typeof raw.returnOn !== 'string' || !isIsoDate(raw.returnOn) || raw.returnOn < raw.onDate) return null;
    returnOn = raw.returnOn;
  }
  const vet = optionalText(raw.vet, TEXT_MAX);
  const notes = optionalText(raw.notes, NOTES_MAX);
  if (vet === undefined || notes === undefined) return null;
  return { kind, onDate: raw.onDate, title, vet, notes, returnOn };
}
