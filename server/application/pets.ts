// The chefes: profile, tutoria, allergies and weight (docs/spec/chefes.md).
// Any member sees and edits any chefe; the actor only has to be signed in.
import { PHOTO_MAX_BASE64, type PetView, type RetiredPetView, type WeightEntryView } from '../../src/application/api-contract';
import { normalizeEmail } from '../../src/domain/group/email';
import { normalizeEmergency } from '../../src/domain/pets/emergency';
import {
  isIsoDate,
  isSpecies,
  normalizePetName,
  normalizeProfile,
  normalizeTags,
  type Allergy,
  type FoodKind,
  type Sex,
  type Species,
} from '../../src/domain/pets/pet';
import { isValidAlertPercent, isValidGrams, isValidWeightDate } from '../../src/domain/pets/weight';
import { failure, nowIso, type CommandResult, type Context } from './context';
import { findMember, type Member } from './members';

interface PetRow {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  birth_date: string | null;
  birth_estimated: number;
  sex: Sex | null;
  neutered: number | null;
  microchip: string | null;
  food_kind: FoodKind | null;
  food_brand: string | null;
  food_daily: string | null;
  allergies_answered: number;
  serious_mode: number;
  weight_alert_percent: number;
  tutor_member_id: string | null;
  tutor_email: string;
  tutor_name: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  clinic_name: string | null;
  clinic_phone: string | null;
  clinic_address: string | null;
  plan_name: string | null;
  plan_number: string | null;
  tutor_until: string | null;
  return_name: string | null;
  created_at: string;
}

const PET_SELECT = `SELECT pets.*, members.name AS tutor_name, back.name AS return_name FROM pets
  LEFT JOIN members ON members.id = pets.tutor_member_id AND members.active = 1
  LEFT JOIN members AS back ON back.id = pets.tutor_return_member_id AND back.active = 1`;

/** What the Registrar drawer saves (docs/spec/navegacao.md): the Mural's "Feito" seal shows the newest of these. */
// One query per table, not one UNION: the Durable Object's SQLite allows at most 5 terms in a compound SELECT.
const REGISTER_TABLES = ['weights', 'vaccinations', 'medications', 'care_records', 'visits', 'diary'] as const;
const LAST_RECORD = REGISTER_TABLES.map(
  (table) => `SELECT members.name, r.created_at FROM ${table} AS r JOIN members ON members.id = r.member_id
   WHERE r.pet_id = ? ORDER BY r.created_at DESC LIMIT 1`,
);

function lastRecord(ctx: Context, petId: string): { name: string; created_at: string } | undefined {
  return LAST_RECORD.flatMap((query) => ctx.sql.all<{ name: string; created_at: string }>(query, petId)).reduce<
    { name: string; created_at: string } | undefined
  >((newest, r) => (!newest || r.created_at > newest.created_at ? r : newest), undefined);
}

/** Today in Brasília (UTC-3), as YYYY-MM-DD: the date a weight or birthday is judged against. */
export function todayInBrasilia(ctx: Context): string {
  return new Date(ctx.clock.now().getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function toView(ctx: Context, row: PetRow): PetView {
  const tags = ctx.sql.all<{ tag: string }>('SELECT tag FROM pet_tags WHERE pet_id = ? ORDER BY rowid', row.id).map((r) => r.tag);
  const allergies = ctx.sql.all<Allergy>('SELECT kind, description FROM pet_allergies WHERE pet_id = ? ORDER BY id', row.id);
  const weights = ctx.sql.all<{ id: string; grams: number; on_date: string; name: string }>(
    `SELECT weights.id, weights.grams, weights.on_date, members.name FROM weights
     JOIN members ON members.id = weights.member_id
     WHERE weights.pet_id = ? ORDER BY weights.on_date, weights.created_at, weights.rowid`,
    row.id,
  );
  const last = lastRecord(ctx, row.id);
  return {
    id: row.id,
    species: row.species,
    profile: {
      name: row.name,
      breed: row.breed,
      birthDate: row.birth_date,
      birthEstimated: row.birth_estimated === 1,
      sex: row.sex,
      neutered: row.neutered === null ? null : row.neutered === 1,
      microchip: row.microchip,
      foodKind: row.food_kind,
      foodBrand: row.food_brand,
      foodDaily: row.food_daily,
      allergies,
    },
    tags,
    photoVersion: ctx.sql.all<{ updated_at: string }>('SELECT updated_at FROM pet_photos WHERE pet_id = ?', row.id)[0]?.updated_at ?? null,
    allergiesAnswered: row.allergies_answered === 1,
    seriousMode: row.serious_mode === 1,
    weightAlertPercent: row.weight_alert_percent,
    emergency: {
      vetName: row.vet_name,
      vetPhone: row.vet_phone,
      clinicName: row.clinic_name,
      clinicPhone: row.clinic_phone,
      clinicAddress: row.clinic_address,
      planName: row.plan_name,
      planNumber: row.plan_number,
    },
    tutorMemberId: row.tutor_member_id,
    tutorEmail: row.tutor_email,
    tutorName: row.tutor_name,
    tutorUntil: row.tutor_until,
    tutorReturnName: row.tutor_until ? row.return_name : null,
    arrivedOn: row.created_at.slice(0, 10),
    weights: weights.map((w): WeightEntryView => ({ id: w.id, grams: w.grams, onDate: w.on_date, byName: w.name })),
    lastRecord: last ? { byName: last.name, at: last.created_at } : null,
  };
}

function findPet(ctx: Context, id: unknown): PetRow | null {
  if (typeof id !== 'string') return null;
  const [row] = ctx.sql.all<PetRow>(`${PET_SELECT} WHERE pets.id = ? AND pets.retired_at IS NULL`, id);
  return row ?? null;
}

export function listPets(ctx: Context): PetView[] {
  return ctx.sql.all<PetRow>(`${PET_SELECT} WHERE pets.retired_at IS NULL ORDER BY pets.rowid`).map((row) => toView(ctx, row));
}

const reply = (ctx: Context, petId: string): CommandResult<PetView> => ({
  ok: true,
  value: toView(ctx, findPet(ctx, petId) as PetRow),
  changed: ['pets'],
});

/** Saves the profile, the allergies and the weight-change limit. The species never changes. */
export function updatePet(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  const pet = findPet(ctx, input.petId);
  if (!pet) return failure('not_found');
  const profile = normalizeProfile(input, todayInBrasilia(ctx));
  if (!profile || !isValidAlertPercent(input.weightAlertPercent)) return failure('invalid');

  ctx.sql.run(
    `UPDATE pets SET name = ?, breed = ?, birth_date = ?, birth_estimated = ?, sex = ?, neutered = ?, microchip = ?,
       food_kind = ?, food_brand = ?, food_daily = ?, allergies_answered = 1, weight_alert_percent = ? WHERE id = ?`,
    profile.name,
    profile.breed,
    profile.birthDate,
    profile.birthEstimated ? 1 : 0,
    profile.sex,
    profile.neutered === null ? null : profile.neutered ? 1 : 0,
    profile.microchip,
    profile.foodKind,
    profile.foodBrand,
    profile.foodDaily,
    input.weightAlertPercent,
    pet.id,
  );
  ctx.sql.run('DELETE FROM pet_allergies WHERE pet_id = ?', pet.id);
  for (const allergy of profile.allergies) {
    ctx.sql.run('INSERT INTO pet_allergies (pet_id, kind, description) VALUES (?, ?, ?)', pet.id, allergy.kind, allergy.description);
  }
  return reply(ctx, pet.id);
}

/** Replaces the personality tags; the order is kept. */
export function setTags(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  const pet = findPet(ctx, input.petId);
  if (!pet) return failure('not_found');
  const tags = normalizeTags(input.tags);
  if (!tags) return failure('invalid');
  ctx.sql.run('DELETE FROM pet_tags WHERE pet_id = ?', pet.id);
  for (const tag of tags) ctx.sql.run('INSERT INTO pet_tags (pet_id, tag) VALUES (?, ?)', pet.id, tag);
  return reply(ctx, pet.id);
}

/** A JPEG the app already shrank; the first bytes of any JPEG encode as "/9j/" in base64. */
const isJpegBase64 = (value: string) => value.length <= PHOTO_MAX_BASE64 && /^\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value);

/** Sets or removes the photo. Its `updated_at` is also the version in the image's address. */
export function setPhoto(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  const pet = findPet(ctx, input.petId);
  if (!pet) return failure('not_found');
  if (input.image === null) {
    ctx.sql.run('DELETE FROM pet_photos WHERE pet_id = ?', pet.id);
  } else if (typeof input.image === 'string' && isJpegBase64(input.image)) {
    ctx.sql.run(
      `INSERT INTO pet_photos (pet_id, image, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(pet_id) DO UPDATE SET image = excluded.image, updated_at = excluded.updated_at`,
      pet.id,
      input.image,
      nowIso(ctx),
    );
  } else {
    return failure('invalid');
  }
  return reply(ctx, pet.id);
}

/** The photo as base64 JPEG, for the Worker to serve; null without one. */
export function photoOf(ctx: Context, petId: string): string | null {
  if (!findPet(ctx, petId)) return null;
  return ctx.sql.all<{ image: string }>('SELECT image FROM pet_photos WHERE pet_id = ?', petId)[0]?.image ?? null;
}

/** Saves the vet, 24 h clinic and health plan of the Cartão SOS; blank fields clear them. */
export function setEmergency(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  const pet = findPet(ctx, input.petId);
  if (!pet) return failure('not_found');
  const emergency = normalizeEmergency(input);
  if (!emergency) return failure('invalid');
  ctx.sql.run(
    `UPDATE pets SET vet_name = ?, vet_phone = ?, clinic_name = ?, clinic_phone = ?, clinic_address = ?, plan_name = ?, plan_number = ? WHERE id = ?`,
    emergency.vetName,
    emergency.vetPhone,
    emergency.clinicName,
    emergency.clinicPhone,
    emergency.clinicAddress,
    emergency.planName,
    emergency.planNumber,
    pet.id,
  );
  return reply(ctx, pet.id);
}

/** Trocar o responsável é uma ação explícita; o novo tutor precisa ser um membro ativo. */
export function setTutor(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  const pet = findPet(ctx, input.petId);
  if (!pet) return failure('not_found');
  if (typeof input.memberId !== 'string') return failure('invalid');
  const member = findMember(ctx, input.memberId);
  if (!member || !member.active) return failure('not_found');
  ctx.sql.run(
    `UPDATE pets SET tutor_member_id = ?, tutor_email = ?, tutor_until = NULL, tutor_return_member_id = NULL, tutor_return_email = NULL
     WHERE id = ?`,
    member.id,
    normalizeEmail(member.email),
    pet.id,
  );
  return reply(ctx, pet.id);
}

/**
 * Lends the tutoria until a future day (a trip, a shift); the current tutor takes it back that day
 * (`returnTutorias`, run by the cron). Lending again keeps the original tutor as the one who returns.
 */
export function lendTutoria(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  const pet = findPet(ctx, input.petId);
  if (!pet) return failure('not_found');
  const today = todayInBrasilia(ctx);
  if (typeof input.memberId !== 'string' || typeof input.until !== 'string' || !isIsoDate(input.until) || input.until <= today) return failure('invalid');
  const member = findMember(ctx, input.memberId);
  if (!member || !member.active) return failure('not_found');
  if (member.id === pet.tutor_member_id) return failure('invalid');
  const [current] = ctx.sql.all<{ tutor_member_id: string | null; tutor_email: string; tutor_return_member_id: string | null; tutor_return_email: string | null }>(
    'SELECT tutor_member_id, tutor_email, tutor_return_member_id, tutor_return_email FROM pets WHERE id = ?',
    pet.id,
  );
  const returnId = current.tutor_return_email ? current.tutor_return_member_id : current.tutor_member_id;
  const returnEmail = current.tutor_return_email ?? current.tutor_email;
  ctx.sql.run(
    `UPDATE pets SET tutor_member_id = ?, tutor_email = ?, tutor_until = ?, tutor_return_member_id = ?, tutor_return_email = ? WHERE id = ?`,
    member.id,
    normalizeEmail(member.email),
    input.until,
    returnId,
    returnEmail,
    pet.id,
  );
  return reply(ctx, pet.id);
}

/** Gives every lent tutoria back once its day comes. True when something changed. */
export function returnTutorias(ctx: Context): boolean {
  const due = ctx.sql.all<{ id: string }>('SELECT id FROM pets WHERE tutor_until IS NOT NULL AND tutor_until <= ?', todayInBrasilia(ctx));
  for (const { id } of due) {
    ctx.sql.run(
      `UPDATE pets SET tutor_email = tutor_return_email,
         tutor_member_id = (SELECT members.id FROM members WHERE members.email = pets.tutor_return_email AND members.active = 1),
         tutor_until = NULL, tutor_return_member_id = NULL, tutor_return_email = NULL
       WHERE id = ?`,
      id,
    );
  }
  return due.length > 0;
}

/** The Exame Admissional: only the name and the species; whoever registers is the tutor. */
export function createPet(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  const name = normalizePetName(input.name);
  if (!name || !isSpecies(input.species)) return failure('invalid');
  const id = `pet-${ctx.ids.next()}`;
  ctx.sql.run(
    'INSERT INTO pets (id, name, species, tutor_member_id, tutor_email, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    name,
    input.species,
    actor.id,
    normalizeEmail(actor.email),
    nowIso(ctx),
  );
  return reply(ctx, id);
}

/** Retires a chefe: it leaves the Mural, the reminders and every list; its records stay in the database. */
export function retirePet(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  const pet = findPet(ctx, input.petId);
  if (!pet) return failure('not_found');
  ctx.sql.run('UPDATE pets SET retired_at = ? WHERE id = ?', nowIso(ctx), pet.id);
  return { ok: true, value: null, changed: ['pets'] };
}

export function listRetiredPets(ctx: Context): RetiredPetView[] {
  return ctx.sql
    .all<{ id: string; name: string; species: Species; created_at: string; retired_at: string }>(
      'SELECT id, name, species, created_at, retired_at FROM pets WHERE retired_at IS NOT NULL ORDER BY retired_at DESC',
    )
    .map((r) => ({ id: r.id, name: r.name, species: r.species, arrivedOn: r.created_at.slice(0, 10), retiredOn: r.retired_at.slice(0, 10) }));
}

/** Registers a weight with its date; who weighed is the actor. */
export function addWeight(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  const pet = findPet(ctx, input.petId);
  if (!pet) return failure('not_found');
  if (!isValidGrams(input.grams) || !isValidWeightDate(input.onDate, todayInBrasilia(ctx))) return failure('invalid');
  ctx.sql.run(
    'INSERT INTO weights (id, pet_id, grams, on_date, member_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ctx.ids.next(),
    pet.id,
    input.grams,
    input.onDate,
    actor.id,
    nowIso(ctx),
  );
  return reply(ctx, pet.id);
}

export function removeWeight(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  if (typeof input.weightId !== 'string') return failure('invalid');
  const [row] = ctx.sql.all<{ pet_id: string }>('SELECT pet_id FROM weights WHERE id = ?', input.weightId);
  if (!row) return failure('not_found');
  ctx.sql.run('DELETE FROM weights WHERE id = ?', input.weightId);
  return reply(ctx, row.pet_id);
}

/** When a member signs in, the chefes tied to their e-mail point to their account. */
export function linkTutor(ctx: Context, memberId: string, email: string): void {
  ctx.sql.run('UPDATE pets SET tutor_member_id = ? WHERE tutor_email = ?', memberId, normalizeEmail(email));
}
