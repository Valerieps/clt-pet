// A pet's emergency contacts and health plan (docs/spec/cartao-sos.md). All optional.
export interface Emergency {
  readonly vetName: string | null;
  readonly vetPhone: string | null;
  readonly clinicName: string | null;
  readonly clinicPhone: string | null;
  readonly clinicAddress: string | null;
  readonly planName: string | null;
  readonly planNumber: string | null;
}

export const EMPTY_EMERGENCY: Emergency = {
  vetName: null,
  vetPhone: null,
  clinicName: null,
  clinicPhone: null,
  clinicAddress: null,
  planName: null,
  planNumber: null,
};

export const EMERGENCY_TEXT_MAX = 80;
export const EMERGENCY_ADDRESS_MAX = 200;
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;

function text(value: unknown, max = EMERGENCY_TEXT_MAX): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().replace(/\s+/g, ' ');
  if (clean.length === 0) return null;
  return clean.length <= max ? clean : undefined;
}

/**
 * Formats a pasted or typed Brazilian phone: "(11) 91234-5678", "(11) 3000-1234", "0800 123 4567",
 * "+55 (11) 91234-5678". Local numbers without area code get only the hyphen. Anything it does not
 * recognize (other countries, odd lengths) is returned trimmed, untouched.
 */
export function formatPhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  if (/^0[3589]00\d{6,7}$/.test(digits)) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  let country = '';
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13) && (hasPlus || digits.length === 13 || /^55[1-9]\d/.test(digits))) {
    country = '+55 ';
    digits = digits.slice(2);
  } else if (hasPlus) {
    return trimmed;
  } else if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1);
  }
  const hyphen = (n: string) => `${n.slice(0, -4)}-${n.slice(-4)}`;
  if (digits.length === 11 || digits.length === 10) return `${country}(${digits.slice(0, 2)}) ${hyphen(digits.slice(2))}`;
  if (!country && (digits.length === 9 || digits.length === 8)) return hyphen(digits);
  return trimmed;
}

/** A phone as typed, kept when it holds 8 to 15 digits and only phone characters. */
function phone(value: unknown): string | null | undefined {
  const clean = text(value);
  if (!clean) return clean;
  const digits = clean.replace(/\D/g, '').length;
  return PHONE_PATTERN.test(clean) && digits >= 8 && digits <= 15 ? formatPhone(clean) : undefined;
}

/** Validates the raw input of `pet.setEmergency`; null when anything is wrong. */
export function normalizeEmergency(raw: Record<string, unknown>): Emergency | null {
  const result = {
    vetName: text(raw.vetName),
    vetPhone: phone(raw.vetPhone),
    clinicName: text(raw.clinicName),
    clinicPhone: phone(raw.clinicPhone),
    clinicAddress: text(raw.clinicAddress, EMERGENCY_ADDRESS_MAX),
    planName: text(raw.planName),
    planNumber: text(raw.planNumber),
  };
  if (Object.values(result).some((v) => v === undefined)) return null;
  return result as Emergency;
}

/** Google Maps directions to the address; with no origin, Maps starts from the current location. */
export function mapsDirectionsHref(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
}

/** The `tel:` link for a typed phone: digits and a leading +. */
export function telHref(phoneText: string): string {
  const plus = phoneText.trim().startsWith('+') ? '+' : '';
  return `tel:${plus}${phoneText.replace(/\D/g, '')}`;
}
