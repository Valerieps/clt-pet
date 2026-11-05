// A chefe's profile (docs/spec/chefes.md, "Perfil" and "Alergias e restrições").
export type Species = 'cat' | 'dog';
export type Sex = 'female' | 'male';
export type FoodKind = 'dry' | 'wet';
export type AllergyKind = 'drug' | 'food';

export interface Allergy {
  readonly kind: AllergyKind;
  readonly description: string;
}

/** What the owner edits. Only `name` is required; the rest starts empty. */
export interface PetProfile {
  readonly name: string;
  readonly breed: string | null;
  /** ISO date (YYYY-MM-DD). */
  readonly birthDate: string | null;
  readonly sex: Sex | null;
  readonly neutered: boolean | null;
  readonly microchip: string | null;
  readonly foodKind: FoodKind | null;
  readonly foodBrand: string | null;
  readonly foodDaily: string | null;
  readonly allergies: readonly Allergy[];
}

export const PET_NAME_MAX = 40;
export const TEXT_MAX = 80;
export const MICROCHIP_MAX = 30;
export const MAX_ALLERGIES = 20;
export const SPECIES: readonly Species[] = ['cat', 'dog'];
const SEXES: readonly Sex[] = ['female', 'male'];
const FOOD_KINDS: readonly FoodKind[] = ['dry', 'wet'];
const ALLERGY_KINDS: readonly AllergyKind[] = ['drug', 'food'];

export const isSpecies = (value: unknown): value is Species => SPECIES.includes(value as Species);

/** Trimmed text; null when empty, undefined when not a string or too long. */
function text(value: unknown, max: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().replace(/\s+/g, ' ');
  if (clean.length === 0) return null;
  return clean.length <= max ? clean : undefined;
}

export function normalizePetName(value: unknown): string | null {
  return text(value, PET_NAME_MAX) ?? null;
}

/** A real calendar date, as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): T | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  return options.includes(value as T) ? (value as T) : undefined;
}

/** Validates the raw input of `pet.update`; null when anything is wrong. `today` is YYYY-MM-DD. */
export function normalizeProfile(raw: Record<string, unknown>, today: string): PetProfile | null {
  const name = normalizePetName(raw.name);
  if (!name) return null;
  const breed = text(raw.breed, TEXT_MAX);
  const microchip = text(raw.microchip, MICROCHIP_MAX);
  const foodBrand = text(raw.foodBrand, TEXT_MAX);
  const foodDaily = text(raw.foodDaily, TEXT_MAX);
  const sex = oneOf(raw.sex, SEXES);
  const foodKind = oneOf(raw.foodKind, FOOD_KINDS);
  if (
    breed === undefined ||
    microchip === undefined ||
    foodBrand === undefined ||
    foodDaily === undefined ||
    sex === undefined ||
    foodKind === undefined
  ) {
    return null;
  }

  let birthDate: string | null = null;
  if (raw.birthDate !== null && raw.birthDate !== undefined && raw.birthDate !== '') {
    if (typeof raw.birthDate !== 'string' || !isIsoDate(raw.birthDate) || raw.birthDate > today) return null;
    birthDate = raw.birthDate;
  }

  let neutered: boolean | null = null;
  if (raw.neutered !== null && raw.neutered !== undefined) {
    if (typeof raw.neutered !== 'boolean') return null;
    neutered = raw.neutered;
  }

  const allergies = normalizeAllergies(raw.allergies);
  if (!allergies) return null;

  return { name, breed, birthDate, sex, neutered, microchip, foodKind, foodBrand, foodDaily, allergies };
}

function normalizeAllergies(raw: unknown): Allergy[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_ALLERGIES) return null;
  const result: Allergy[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null;
    const kind = oneOf((item as Record<string, unknown>).kind, ALLERGY_KINDS);
    const description = text((item as Record<string, unknown>).description, TEXT_MAX);
    if (!kind || description === undefined) return null;
    if (description !== null) result.push({ kind, description });
  }
  return result;
}

/** YYYY-MM-DD → DD/MM/YYYY. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export type MissingField = 'breed' | 'birthDate' | 'sex' | 'neutered' | 'microchip' | 'food' | 'allergies';

/** What the profile still lacks, so the screen can say so. `allergiesAnswered` is false while nothing was ever filled in. */
export function missingFields(profile: PetProfile, allergiesAnswered: boolean): MissingField[] {
  const missing: MissingField[] = [];
  if (!profile.breed) missing.push('breed');
  if (!profile.birthDate) missing.push('birthDate');
  if (!profile.sex) missing.push('sex');
  if (profile.neutered === null) missing.push('neutered');
  if (!profile.microchip) missing.push('microchip');
  if (!profile.foodKind || !profile.foodBrand || !profile.foodDaily) missing.push('food');
  if (!allergiesAnswered) missing.push('allergies');
  return missing;
}
