// Parasite and hygiene care (docs/spec/cuidados.md). Any member registers and removes records.
import type { CareView } from '../../src/application/api-contract';
import { normalizeCare, type CareCategory } from '../../src/domain/care/care';
import { careOccurrences, currentPrazos } from '../../src/domain/prazos';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { petsExist } from './pet-guard';
import { dropPlans, listPlans, plansOf } from './plans';
import { todayInBrasilia } from './pets';
import type { ReminderSource } from './reminders';

interface CareRow {
  id: string;
  pet_id: string;
  category: CareCategory;
  item: string;
  done_on: string;
  interval_days: number;
  note: string | null;
  name: string;
}

const SELECT = `SELECT c.id, c.pet_id, c.category, c.item, c.done_on, c.interval_days, c.note, members.name
  FROM care_records c
  JOIN members ON members.id = c.member_id
  JOIN pets ON pets.id = c.pet_id AND pets.retired_at IS NULL`;
const ORDER = 'ORDER BY c.done_on, c.created_at, c.rowid';

const toView = (r: CareRow): CareView => ({
  id: r.id,
  petId: r.pet_id,
  category: r.category,
  item: r.item,
  doneOn: r.done_on,
  intervalDays: r.interval_days,
  note: r.note,
  byName: r.name,
});

export function listCare(ctx: Context): CareView[] {
  return ctx.sql.all<CareRow>(`${SELECT} ${ORDER}`).map(toView);
}

/**
 * The next dose of each parasite item, recorded or planned (docs/spec/prazos.md), for the push reminders.
 * Hygiene has no push: its intervals are too short.
 */
export const careReminders: ReminderSource = (ctx) => {
  const all = listCare(ctx).filter((c) => c.category === 'parasite');
  const plans = listPlans(ctx).filter((p) => p.kind === 'parasite');
  const today = todayInBrasilia(ctx);
  return [...new Set([...all, ...plans].map((c) => c.petId))].flatMap((petId) =>
    currentPrazos('parasite', careOccurrences(all.filter((c) => c.petId === petId)), plansOf(plans, petId), today).map((p) => ({
      petId,
      item: p.item,
      dueOn: p.due,
      tab: 'cuidados',
    })),
  );
};

/** Registers the same record for several chefes at once; all of them must exist, or nothing is saved. */
export function addCare(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<CareView[]> {
  const record = normalizeCare(input, todayInBrasilia(ctx));
  const { petIds } = input;
  if (!record || !Array.isArray(petIds) || petIds.length === 0 || petIds.some((id) => typeof id !== 'string')) return failure('invalid');
  const ids = [...new Set(petIds as string[])];
  if (!petsExist(ctx, ids)) return failure('not_found');
  const created: string[] = [];
  for (const petId of ids) {
    const id = ctx.ids.next();
    created.push(id);
    ctx.sql.run(
      `INSERT INTO care_records (id, pet_id, category, item, done_on, interval_days, note, member_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      petId,
      record.category,
      record.item,
      record.doneOn,
      record.intervalDays,
      record.note,
      actor.id,
      nowIso(ctx),
    );
  }
  const replanned = dropPlans(ctx, ids, record.category, record.item);
  return { ok: true, value: listCare(ctx).filter((c) => created.includes(c.id)), changed: replanned ? ['care', 'plans'] : ['care'] };
}

export function removeCare(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.careId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM care_records WHERE id = ?', input.careId).length === 0) return failure('not_found');
  ctx.sql.run('DELETE FROM care_records WHERE id = ?', input.careId);
  return { ok: true, value: null, changed: ['care'] };
}
