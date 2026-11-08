// The vaccination card (docs/spec/vacinas.md). Any member registers and removes doses.
import type { VaccinationView } from '../../src/application/api-contract';
import { currentPrazos, doseOccurrences } from '../../src/domain/prazos';
import { normalizeDose } from '../../src/domain/vaccines/vaccine';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { todayInBrasilia } from './pets';
import { dropPlans, listPlans, plansOf } from './plans';
import type { ReminderSource } from './reminders';

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

/** The next date of each chefe's vaccines, recorded or planned (docs/spec/prazos.md), for the push reminders (docs/spec/lembretes.md). */
export const vaccineReminders: ReminderSource = (ctx) => {
  const all = listVaccinations(ctx);
  const plans = listPlans(ctx).filter((p) => p.kind === 'vaccine');
  const today = todayInBrasilia(ctx);
  return [...new Set([...all, ...plans].map((v) => v.petId))].flatMap((petId) =>
    currentPrazos('vaccine', doseOccurrences(all.filter((v) => v.petId === petId)), plansOf(plans, petId), today).map((p) => ({
      petId,
      item: `Vacina ${p.item}`,
      dueOn: p.due,
      tab: 'vacinas',
    })),
  );
};

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
  const replanned = dropPlans(ctx, ids, 'vaccine', dose.vaccine);
  const value = listVaccinations(ctx).filter((v) => created.includes(v.id));
  return { ok: true, value, changed: replanned ? ['vaccinations', 'plans'] : ['vaccinations'] };
}

export function removeVaccination(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.vaccinationId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM vaccinations WHERE id = ?', input.vaccinationId).length === 0) return failure('not_found');
  ctx.sql.run('DELETE FROM vaccinations WHERE id = ?', input.vaccinationId);
  return { ok: true, value: null, changed: ['vaccinations'] };
}
