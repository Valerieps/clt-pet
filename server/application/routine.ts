// The diary and the meals (docs/spec/saude.md, docs/spec/chefes.md "Alimentação"). Any member writes and removes.
import type { DiaryEntryView, MealView } from '../../src/application/api-contract';
import { normalizeDiary, normalizeMeal } from '../../src/domain/routine/routine';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';
import { petsExist } from './pet-guard';
import { todayInBrasilia } from './pets';

interface DiaryRow {
  id: string;
  pet_id: string;
  on_date: string;
  text: string;
  member_name: string;
}

const DIARY_SELECT = `SELECT d.id, d.pet_id, d.on_date, d.text, members.name AS member_name
  FROM diary d
  JOIN members ON members.id = d.member_id
  JOIN pets ON pets.id = d.pet_id AND pets.retired_at IS NULL`;

const diaryView = (r: DiaryRow): DiaryEntryView => ({ id: r.id, petId: r.pet_id, onDate: r.on_date, text: r.text, byName: r.member_name });

/** Newest first would need a reverse in the app; the list is oldest first like the others. */
export function listDiary(ctx: Context): DiaryEntryView[] {
  return ctx.sql.all<DiaryRow>(`${DIARY_SELECT} ORDER BY d.on_date, d.created_at, d.rowid`).map(diaryView);
}

export function addDiary(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<DiaryEntryView> {
  const entry = normalizeDiary(input, todayInBrasilia(ctx));
  if (!entry || typeof input.petId !== 'string') return failure('invalid');
  if (!petsExist(ctx, [input.petId])) return failure('not_found');
  const id = ctx.ids.next();
  ctx.sql.run('INSERT INTO diary (id, pet_id, on_date, text, member_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, input.petId, entry.onDate, entry.text, actor.id, nowIso(ctx));
  return { ok: true, value: ctx.sql.all<DiaryRow>(`${DIARY_SELECT} WHERE d.id = ?`, id).map(diaryView)[0], changed: ['diary'] };
}

export function removeDiary(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.entryId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM diary WHERE id = ?', input.entryId).length === 0) return failure('not_found');
  ctx.sql.run('DELETE FROM diary WHERE id = ?', input.entryId);
  return { ok: true, value: null, changed: ['diary'] };
}

interface MealRow {
  id: string;
  pet_id: string;
  at: string;
  amount: string | null;
  note: string | null;
}

const MEAL_SELECT = `SELECT m.id, m.pet_id, m.at, m.amount, m.note FROM meals m
  JOIN pets ON pets.id = m.pet_id AND pets.retired_at IS NULL`;

const mealView = (r: MealRow): MealView => ({ id: r.id, petId: r.pet_id, at: r.at, amount: r.amount, note: r.note });

export function listMeals(ctx: Context): MealView[] {
  return ctx.sql.all<MealRow>(`${MEAL_SELECT} ORDER BY m.at, m.created_at, m.rowid`).map(mealView);
}

export function addMeal(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<MealView> {
  const meal = normalizeMeal(input);
  if (!meal || typeof input.petId !== 'string') return failure('invalid');
  if (!petsExist(ctx, [input.petId])) return failure('not_found');
  const id = ctx.ids.next();
  ctx.sql.run('INSERT INTO meals (id, pet_id, at, amount, note, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, input.petId, meal.at, meal.amount, meal.note, nowIso(ctx));
  return { ok: true, value: ctx.sql.all<MealRow>(`${MEAL_SELECT} WHERE m.id = ?`, id).map(mealView)[0], changed: ['meals'] };
}

export function removeMeal(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.mealId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM meals WHERE id = ?', input.mealId).length === 0) return failure('not_found');
  ctx.sql.run('DELETE FROM meals WHERE id = ?', input.mealId);
  return { ok: true, value: null, changed: ['meals'] };
}
