// Planned prazos (docs/spec/prazos.md). Any member plans an item's next date and removes a plan; a
// record of the same item removes the plan, so from then on the record decides.
import type { PlanView } from '../../src/application/api-contract';
import { normalizePlan, routineDueAfter, sameItem, type Plan, type PrazoKind } from '../../src/domain/prazos';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { petsExist } from './pet-guard';

interface PlanRow {
  id: string;
  pet_id: string;
  kind: PrazoKind;
  item: string;
  due_on: string;
  interval_days: number;
  dose: string | null;
  name: string;
}

const toView = (r: PlanRow): PlanView => ({
  id: r.id,
  petId: r.pet_id,
  kind: r.kind,
  item: r.item,
  dueOn: r.due_on,
  intervalDays: r.interval_days,
  dose: r.dose,
  byName: r.name,
});

export function listPlans(ctx: Context): PlanView[] {
  return ctx.sql
    .all<PlanRow>(
      `SELECT p.id, p.pet_id, p.kind, p.item, p.due_on, p.interval_days, p.dose, members.name
       FROM plans p
       JOIN members ON members.id = p.member_id
       JOIN pets ON pets.id = p.pet_id AND pets.retired_at IS NULL
       ORDER BY p.due_on, p.created_at, p.rowid`,
    )
    .map(toView);
}

/** One chefe's plans, for the reminders: the domain shape. */
export const plansOf = (all: readonly PlanView[], petId: string): Plan[] => all.filter((p) => p.petId === petId);

/** Removes the plans of `item` for these chefes; true when one was removed. Comparison ignores case, like the records. */
export function dropPlans(ctx: Context, petIds: readonly string[], kind: PrazoKind, item: string): boolean {
  let dropped = false;
  for (const petId of petIds) {
    const rows = ctx.sql.all<{ id: string; item: string }>('SELECT id, item FROM plans WHERE pet_id = ? AND kind = ?', petId, kind);
    for (const row of rows.filter((r) => sameItem(r.item, item))) {
      ctx.sql.run('DELETE FROM plans WHERE id = ?', row.id);
      dropped = true;
    }
  }
  return dropped;
}

/**
 * A consulta done moves the routine plan of the same subject (docs/spec/prazos.md): the next one is the
 * consulta's date plus the interval. Unlike the other kinds the plan stays, as a consulta has no interval.
 */
export function advanceRoutine(ctx: Context, petId: string, title: string, onDate: string): boolean {
  const rows = ctx.sql.all<{ id: string; item: string; due_on: string; interval_days: number }>(
    `SELECT id, item, due_on, interval_days FROM plans WHERE pet_id = ? AND kind = 'visit'`,
    petId,
  );
  let moved = false;
  for (const row of rows.filter((r) => sameItem(r.item, title))) {
    const next = routineDueAfter({ dueOn: row.due_on, intervalDays: row.interval_days }, onDate);
    if (next === null) continue;
    ctx.sql.run('UPDATE plans SET due_on = ? WHERE id = ?', next, row.id);
    moved = true;
  }
  return moved;
}

/** Plans the same item for several chefes at once, replacing each one's earlier plan of that item; all must exist, or nothing is saved. */
export function addPlan(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<PlanView[]> {
  const plan = normalizePlan(input);
  const { petIds } = input;
  if (!plan || !Array.isArray(petIds) || petIds.length === 0 || petIds.some((id) => typeof id !== 'string')) return failure('invalid');
  const ids = [...new Set(petIds as string[])];
  if (!petsExist(ctx, ids)) return failure('not_found');
  dropPlans(ctx, ids, plan.kind, plan.item);
  const created: string[] = [];
  for (const petId of ids) {
    const id = ctx.ids.next();
    created.push(id);
    ctx.sql.run(
      `INSERT INTO plans (id, pet_id, kind, item, due_on, interval_days, dose, member_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      petId,
      plan.kind,
      plan.item,
      plan.dueOn,
      plan.intervalDays,
      plan.dose,
      actor.id,
      nowIso(ctx),
    );
  }
  return { ok: true, value: listPlans(ctx).filter((p) => created.includes(p.id)), changed: ['plans'] };
}

export function removePlan(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.planId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM plans WHERE id = ?', input.planId).length === 0) return failure('not_found');
  ctx.sql.run('DELETE FROM plans WHERE id = ?', input.planId);
  return { ok: true, value: null, changed: ['plans'] };
}
