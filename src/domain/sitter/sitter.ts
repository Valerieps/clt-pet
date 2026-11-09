// The Manual do Funcionário Temporário (docs/spec/manual-temporario.md): one link per pet sitter.
import { optionalText } from '../health/health';
import { addDays } from '../vaccines/vaccine';

export const SITTER_LABEL_MAX = 60;
export const SITTER_NOTE_MAX = 1000;
export const SITTER_MAX_DAYS = 90;
export const SITTER_DEFAULT_DAYS = 7;
export const MAX_SITTER_PETS = 20;

export interface SitterLinkInput {
  readonly label: string;
  readonly petIds: string[];
  readonly note: string | null;
  /** YYYY-MM-DD: the last day the link opens. */
  readonly expiresOn: string;
}

/** The label and at least one pet are required; the link lasts 1 to 90 days, counting today. Null when invalid. */
export function normalizeSitterLink(raw: Record<string, unknown>, today: string): SitterLinkInput | null {
  if (typeof raw.label !== 'string') return null;
  const label = raw.label.trim();
  if (label === '' || label.length > SITTER_LABEL_MAX) return null;
  if (!Array.isArray(raw.petIds) || raw.petIds.length === 0 || raw.petIds.length > MAX_SITTER_PETS) return null;
  if (raw.petIds.some((id) => typeof id !== 'string')) return null;
  const days = raw.days === undefined ? SITTER_DEFAULT_DAYS : raw.days;
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > SITTER_MAX_DAYS) return null;
  const note = optionalText(raw.note, SITTER_NOTE_MAX);
  if (note === undefined) return null;
  return { label, petIds: [...new Set(raw.petIds as string[])], note, expiresOn: addDays(today, days - 1) };
}

export const isSitterTokenShape = (value: string): boolean => /^[a-f0-9]{64}$/.test(value);
