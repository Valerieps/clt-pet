// The chefes: profile, tutoria, allergies and weight (docs/spec/chefes.md).
// Any member sees and edits any chefe; the actor only has to be signed in.
import type { PetView, WeightEntryView } from '../../src/application/api-contract';
import { normalizeEmail } from '../../src/domain/group/email';
import { normalizeEmergency } from '../../src/domain/pets/emergency';
import { normalizeProfile, type Allergy, type FoodKind, type Sex, type Species } from '../../src/domain/pets/pet';
import { isValidAlertPercent, isValidGrams, isValidWeightDate } from '../../src/domain/pets/weight';
import { failure, nowIso, type CommandResult, type Context } from './context';
import { findMember, type Member } from './members';

interface PetRow {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  birth_date: string | null;
  sex: Sex | null;
  neutered: number | null;
  microchip: string | null;
  food_kind: FoodKind | null;
  food_brand: string | null;
  food_daily: string | null;
  allergies_answered: number;
  weight_alert_percent: number;
  tutor_member_id: string | null;
  tutor_email: string;
  tutor_name: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  clinic_name: string | null;
  clinic_phone: string | null;
  plan_name: string | null;
  plan_number: string | null;
}

const PET_SELECT = `SELECT pets.*, members.name AS tutor_name FROM pets
  LEFT JOIN members ON members.id = pets.tutor_member_id AND members.active = 1`;

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
  return {
    id: row.id,
    species: row.species,
    profile: {
      name: row.name,
      breed: row.breed,
      birthDate: row.birth_date,
      sex: row.sex,
      neutered: row.neutered === null ? null : row.neutered === 1,
      microchip: row.microchip,
      foodKind: row.food_kind,
      foodBrand: row.food_brand,
      foodDaily: row.food_daily,
      allergies,
    },
    tags,
    allergiesAnswered: row.allergies_answered === 1,
    weightAlertPercent: row.weight_alert_percent,
    emergency: {
      vetName: row.vet_name,
      vetPhone: row.vet_phone,
      clinicName: row.clinic_name,
      clinicPhone: row.clinic_phone,
      planName: row.plan_name,
      planNumber: row.plan_number,
    },
    tutorMemberId: row.tutor_member_id,
    tutorEmail: row.tutor_email,
    tutorName: row.tutor_name,
    weights: weights.map((w): WeightEntryView => ({ id: w.id, grams: w.grams, onDate: w.on_date, byName: w.name })),
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
    `UPDATE pets SET name = ?, breed = ?, birth_date = ?, sex = ?, neutered = ?, microchip = ?,
       food_kind = ?, food_brand = ?, food_daily = ?, allergies_answered = 1, weight_alert_percent = ? WHERE id = ?`,
    profile.name,
    profile.breed,
    profile.birthDate,
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

/** Saves the vet, 24 h clinic and health plan of the Cartão SOS; blank fields clear them. */
export function setEmergency(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<PetView> {
  const pet = findPet(ctx, input.petId);
  if (!pet) return failure('not_found');
  const emergency = normalizeEmergency(input);
  if (!emergency) return failure('invalid');
  ctx.sql.run(
    `UPDATE pets SET vet_name = ?, vet_phone = ?, clinic_name = ?, clinic_phone = ?, plan_name = ?, plan_number = ? WHERE id = ?`,
    emergency.vetName,
    emergency.vetPhone,
    emergency.clinicName,
    emergency.clinicPhone,
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
  ctx.sql.run('UPDATE pets SET tutor_member_id = ?, tutor_email = ? WHERE id = ?', member.id, normalizeEmail(member.email), pet.id);
  return reply(ctx, pet.id);
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
