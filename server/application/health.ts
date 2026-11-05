// Conditions, consultas, exames and laudos (docs/spec/saude.md). Any member registers and removes.
import type { ConditionView, VisitView } from '../../src/application/api-contract';
import { normalizeCondition, normalizeVisit, type VisitKind } from '../../src/domain/health/health';
import { isIsoDate } from '../../src/domain/pets/pet';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { petsExist } from './pet-guard';
import { todayInBrasilia } from './pets';
import type { ReminderSource } from './reminders';

interface ConditionRow {
  id: string;
  pet_id: string;
  name: string;
  grave: number;
  since: string | null;
  notes: string | null;
  resolved_on: string | null;
  member_name: string;
}

const CONDITION_SELECT = `SELECT c.id, c.pet_id, c.name, c.grave, c.since, c.notes, c.resolved_on, members.name AS member_name
  FROM conditions c
  JOIN members ON members.id = c.member_id
  JOIN pets ON pets.id = c.pet_id AND pets.retired_at IS NULL`;

const conditionView = (r: ConditionRow): ConditionView => ({
  id: r.id,
  petId: r.pet_id,
  name: r.name,
  grave: r.grave === 1,
  since: r.since,
  notes: r.notes,
  resolvedOn: r.resolved_on,
  byName: r.member_name,
});

export function listConditions(ctx: Context): ConditionView[] {
  return ctx.sql.all<ConditionRow>(`${CONDITION_SELECT} ORDER BY c.created_at, c.rowid`).map(conditionView);
}

const conditionById = (ctx: Context, id: string): ConditionView | undefined =>
  ctx.sql.all<ConditionRow>(`${CONDITION_SELECT} WHERE c.id = ?`, id).map(conditionView)[0];

export function addCondition(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<ConditionView> {
  const condition = normalizeCondition(input, todayInBrasilia(ctx));
  if (!condition || typeof input.petId !== 'string') return failure('invalid');
  if (!petsExist(ctx, [input.petId])) return failure('not_found');
  const id = ctx.ids.next();
  ctx.sql.run(
    `INSERT INTO conditions (id, pet_id, name, grave, since, notes, member_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.petId,
    condition.name,
    condition.grave ? 1 : 0,
    condition.since,
    condition.notes,
    actor.id,
    nowIso(ctx),
  );
  return { ok: true, value: conditionById(ctx, id)!, changed: ['conditions'] };
}

/** Marks a condition as resolved (today by default) or, with `resolvedOn: null`, active again. */
export function resolveCondition(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<ConditionView> {
  if (typeof input.conditionId !== 'string') return failure('invalid');
  const today = todayInBrasilia(ctx);
  const resolvedOn = input.resolvedOn === undefined ? today : input.resolvedOn;
  if (resolvedOn !== null && (typeof resolvedOn !== 'string' || !isIsoDate(resolvedOn) || resolvedOn > today)) return failure('invalid');
  if (!conditionById(ctx, input.conditionId)) return failure('not_found');
  ctx.sql.run('UPDATE conditions SET resolved_on = ? WHERE id = ?', resolvedOn, input.conditionId);
  return { ok: true, value: conditionById(ctx, input.conditionId)!, changed: ['conditions'] };
}

export function removeCondition(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.conditionId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM conditions WHERE id = ?', input.conditionId).length === 0) return failure('not_found');
  ctx.sql.run('DELETE FROM conditions WHERE id = ?', input.conditionId);
  return { ok: true, value: null, changed: ['conditions'] };
}

interface VisitRow {
  id: string;
  pet_id: string;
  kind: VisitKind;
  on_date: string;
  title: string;
  vet: string | null;
  notes: string | null;
  return_on: string | null;
  member_name: string;
}

const VISIT_SELECT = `SELECT v.id, v.pet_id, v.kind, v.on_date, v.title, v.vet, v.notes, v.return_on, members.name AS member_name
  FROM visits v
  JOIN members ON members.id = v.member_id
  JOIN pets ON pets.id = v.pet_id AND pets.retired_at IS NULL`;

const visitView = (r: VisitRow): VisitView => ({
  id: r.id,
  petId: r.pet_id,
  kind: r.kind,
  onDate: r.on_date,
  title: r.title,
  vet: r.vet,
  notes: r.notes,
  returnOn: r.return_on,
  byName: r.member_name,
});

export function listVisits(ctx: Context): VisitView[] {
  return ctx.sql.all<VisitRow>(`${VISIT_SELECT} ORDER BY v.on_date, v.created_at, v.rowid`).map(visitView);
}

/** A scheduled return: reminded like a vaccine, under the name "Retorno: <title>". */
export const visitReminders: ReminderSource = (ctx) =>
  listVisits(ctx)
    .filter((v) => v.returnOn !== null)
    .map((v) => ({ petId: v.petId, item: `Retorno: ${v.title}`, dueOn: v.returnOn! }));

export function addVisit(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<VisitView> {
  const visit = normalizeVisit(input, todayInBrasilia(ctx));
  if (!visit || typeof input.petId !== 'string') return failure('invalid');
  if (!petsExist(ctx, [input.petId])) return failure('not_found');
  const id = ctx.ids.next();
  ctx.sql.run(
    `INSERT INTO visits (id, pet_id, kind, on_date, title, vet, notes, return_on, member_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.petId,
    visit.kind,
    visit.onDate,
    visit.title,
    visit.vet,
    visit.notes,
    visit.returnOn,
    actor.id,
    nowIso(ctx),
  );
  return { ok: true, value: ctx.sql.all<VisitRow>(`${VISIT_SELECT} WHERE v.id = ?`, id).map(visitView)[0], changed: ['visits'] };
}

export function removeVisit(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.visitId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM visits WHERE id = ?', input.visitId).length === 0) return failure('not_found');
  ctx.sql.run('DELETE FROM visits WHERE id = ?', input.visitId);
  return { ok: true, value: null, changed: ['visits'] };
}
