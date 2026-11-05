// The vaccination card (docs/spec/vacinas.md). Any member registers and removes doses.
import type { VaccinationView } from '../../src/application/api-contract';
import { normalizeDose } from '../../src/domain/vaccines/vaccine';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { todayInBrasilia } from './pets';

interface VaccinationRow {
  id: string;
  pet_id: string;
  vaccine: string;
  applied_on: string;
  interval_days: number;
  lot: string | null;
  maker: string | null;
  vet: string | null;
  name: string;
}

const SELECT = `SELECT v.id, v.pet_id, v.vaccine, v.applied_on, v.interval_days, v.lot, v.maker, v.vet, members.name
  FROM vaccinations v
  JOIN members ON members.id = v.member_id
  JOIN pets ON pets.id = v.pet_id AND pets.retired_at IS NULL`;
const ORDER = 'ORDER BY v.applied_on, v.created_at, v.rowid';

const toView = (r: VaccinationRow): VaccinationView => ({
  id: r.id,
  petId: r.pet_id,
  vaccine: r.vaccine,
  appliedOn: r.applied_on,
  intervalDays: r.interval_days,
  lot: r.lot,
  maker: r.maker,
  vet: r.vet,
  byName: r.name,
});

export function listVaccinations(ctx: Context): VaccinationView[] {
  return ctx.sql.all<VaccinationRow>(`${SELECT} ${ORDER}`).map(toView);
}

/** Registers the same dose for several chefes at once; all of them must exist, or nothing is saved. */
export function addVaccination(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<VaccinationView[]> {
  const dose = normalizeDose(input, todayInBrasilia(ctx));
  const { petIds } = input;
  if (!dose || !Array.isArray(petIds) || petIds.length === 0 || petIds.some((id) => typeof id !== 'string')) return failure('invalid');
  const ids = [...new Set(petIds as string[])];
  for (const id of ids) {
    if (ctx.sql.all('SELECT 1 FROM pets WHERE id = ? AND retired_at IS NULL', id).length === 0) return failure('not_found');
  }
  const created: string[] = [];
  for (const petId of ids) {
    const id = ctx.ids.next();
    created.push(id);
    ctx.sql.run(
      `INSERT INTO vaccinations (id, pet_id, vaccine, applied_on, interval_days, lot, maker, vet, member_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      petId,
      dose.vaccine,
      dose.appliedOn,
      dose.intervalDays,
      dose.lot,
      dose.maker,
      dose.vet,
      actor.id,
      nowIso(ctx),
    );
  }
  const value = listVaccinations(ctx).filter((v) => created.includes(v.id));
  return { ok: true, value, changed: ['vaccinations'] };
}

export function removeVaccination(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.vaccinationId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM vaccinations WHERE id = ?', input.vaccinationId).length === 0) return failure('not_found');
  ctx.sql.run('DELETE FROM vaccinations WHERE id = ?', input.vaccinationId);
  return { ok: true, value: null, changed: ['vaccinations'] };
}
