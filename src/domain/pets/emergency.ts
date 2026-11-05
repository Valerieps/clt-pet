// A chefe's emergency contacts and health plan (docs/spec/cartao-sos.md). All optional.
export interface Emergency {
  readonly vetName: string | null;
  readonly vetPhone: string | null;
  readonly clinicName: string | null;
  readonly clinicPhone: string | null;
  readonly planName: string | null;
  readonly planNumber: string | null;
}

export const EMPTY_EMERGENCY: Emergency = {
  vetName: null,
  vetPhone: null,
  clinicName: null,
  clinicPhone: null,
  planName: null,
  planNumber: null,
};

export const EMERGENCY_TEXT_MAX = 80;
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;

function text(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().replace(/\s+/g, ' ');
  if (clean.length === 0) return null;
  return clean.length <= EMERGENCY_TEXT_MAX ? clean : undefined;
}

/** A phone as typed, kept when it holds 8 to 15 digits and only phone characters. */
function phone(value: unknown): string | null | undefined {
  const clean = text(value);
  if (!clean) return clean;
  const digits = clean.replace(/\D/g, '').length;
  return PHONE_PATTERN.test(clean) && digits >= 8 && digits <= 15 ? clean : undefined;
}

/** Validates the raw input of `pet.setEmergency`; null when anything is wrong. */
export function normalizeEmergency(raw: Record<string, unknown>): Emergency | null {
  const result = {
    vetName: text(raw.vetName),
    vetPhone: phone(raw.vetPhone),
    clinicName: text(raw.clinicName),
    clinicPhone: phone(raw.clinicPhone),
    planName: text(raw.planName),
    planNumber: text(raw.planNumber),
  };
  if (Object.values(result).some((v) => v === undefined)) return null;
  return result as Emergency;
}

/** The `tel:` link for a typed phone: digits and a leading +. */
export function telHref(phoneText: string): string {
  const plus = phoneText.trim().startsWith('+') ? '+' : '';
  return `tel:${plus}${phoneText.replace(/\D/g, '')}`;
}
