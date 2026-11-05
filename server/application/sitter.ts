// The Manual do Funcionário Temporário (docs/spec/manual-temporario.md): a link per pet sitter that
// opens one read-only page without signing in. The token in the link is the credential.
import type { SitterLinkView, SitterManualView, SitterPetView } from '../../src/application/api-contract';
import { normalizeSitterLink } from '../../src/domain/sitter/sitter';
import { failure, nowIso, type CommandResult, type Context } from './context';
import { listConditions } from './health';
import type { Member } from './members';
import { petsExist } from './pet-guard';
import { listPets, photoOf, todayInBrasilia } from './pets';
import { listMeals } from './routine';

interface LinkRow {
  id: string;
  token: string;
  label: string;
  pet_ids: string;
  note: string | null;
  expires_on: string;
  member_name: string;
}

const SELECT = `SELECT l.id, l.token, l.label, l.pet_ids, l.note, l.expires_on, members.name AS member_name
  FROM sitter_links l JOIN members ON members.id = l.member_id`;

const toView = (ctx: Context, r: LinkRow): SitterLinkView => ({
  id: r.id,
  token: r.token,
  label: r.label,
  petIds: JSON.parse(r.pet_ids) as string[],
  note: r.note,
  expiresOn: r.expires_on,
  expired: r.expires_on < todayInBrasilia(ctx),
  byName: r.member_name,
});

export function listSitterLinks(ctx: Context): SitterLinkView[] {
  return ctx.sql.all<LinkRow>(`${SELECT} WHERE l.revoked_at IS NULL ORDER BY l.created_at DESC, l.rowid DESC`).map((r) => toView(ctx, r));
}

export function createSitterLink(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<SitterLinkView> {
  const link = normalizeSitterLink(input, todayInBrasilia(ctx));
  if (!link) return failure('invalid');
  if (!petsExist(ctx, link.petIds)) return failure('not_found');
  const id = ctx.ids.next();
  // Two UUIDs without dashes: 64 hex characters of randomness in production.
  const token = `${ctx.ids.next()}${ctx.ids.next()}`.replaceAll('-', '');
  ctx.sql.run(
    `INSERT INTO sitter_links (id, token, label, pet_ids, note, expires_on, member_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    token,
    link.label,
    JSON.stringify(link.petIds),
    link.note,
    link.expiresOn,
    actor.id,
    nowIso(ctx),
  );
  return { ok: true, value: toView(ctx, ctx.sql.all<LinkRow>(`${SELECT} WHERE l.id = ?`, id)[0]), changed: ['sitter'] };
}

export function revokeSitterLink(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.linkId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM sitter_links WHERE id = ? AND revoked_at IS NULL', input.linkId).length === 0) return failure('not_found');
  ctx.sql.run('UPDATE sitter_links SET revoked_at = ? WHERE id = ?', nowIso(ctx), input.linkId);
  return { ok: true, value: null, changed: ['sitter'] };
}

/** The link a token opens today: not revoked, not expired. */
function openLink(ctx: Context, token: string): LinkRow | null {
  const [row] = ctx.sql.all<LinkRow>(`${SELECT} WHERE l.token = ? AND l.revoked_at IS NULL AND l.expires_on >= ?`, token, todayInBrasilia(ctx));
  return row ?? null;
}

/** What the sitter's page shows for a token; null when the link is unknown, revoked or expired. */
export function sitterManual(ctx: Context, token: string): SitterManualView | null {
  const link = openLink(ctx, token);
  if (!link) return null;
  const ids = JSON.parse(link.pet_ids) as string[];
  const pets = listPets(ctx).filter((p) => ids.includes(p.id));
  const conditions = listConditions(ctx).filter((c) => c.grave && c.resolvedOn === null);
  const meals = listMeals(ctx);
  const views = pets.map(
    (pet): SitterPetView => ({
      id: pet.id,
      name: pet.profile.name,
      species: pet.species,
      tags: pet.tags,
      photoVersion: pet.photoVersion,
      microchip: pet.profile.microchip,
      allergies: pet.profile.allergies,
      graveConditions: conditions.filter((c) => c.petId === pet.id).map((c) => ({ name: c.name, notes: c.notes })),
      food: { kind: pet.profile.foodKind, brand: pet.profile.foodBrand, daily: pet.profile.foodDaily },
      meals: meals.filter((m) => m.petId === pet.id),
      emergency: pet.emergency,
    }),
  );
  const tutors = [...new Set(pets.map((p) => p.tutorName).filter((n): n is string => n !== null))];
  return { label: link.label, note: link.note, expiresOn: link.expires_on, tutors, pets: views };
}

/** A photo for the sitter's page, only of a chefe the link covers. */
export function sitterPhoto(ctx: Context, token: string, petId: string): string | null {
  const link = openLink(ctx, token);
  return link && (JSON.parse(link.pet_ids) as string[]).includes(petId) ? photoOf(ctx, petId) : null;
}
