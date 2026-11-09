// The medications of each pet (docs/spec/medicacoes.md). Any member registers and removes them.
import type { MedicationView } from '../../src/application/api-contract';
import { normalizeMedication } from '../../src/domain/medications/medication';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';

interface MedicationRow {
  id: string;
  pet_id: string;
  name: string;
  dose: string;
  frequency: MedicationView['frequency'];
  start_on: string;
  end_on: string | null;
  member_name: string;
}

const SELECT = `SELECT m.id, m.pet_id, m.name, m.dose, m.frequency, m.start_on, m.end_on, members.name AS member_name
  FROM medications m
  JOIN members ON members.id = m.member_id
  JOIN pets ON pets.id = m.pet_id AND pets.retired_at IS NULL
  ORDER BY m.start_on, m.created_at, m.rowid`;

const toView = (r: MedicationRow): MedicationView => ({
  id: r.id,
  petId: r.pet_id,
  name: r.name,
  dose: r.dose,
  frequency: r.frequency,
  startOn: r.start_on,
  endOn: r.end_on,
  byName: r.member_name,
});

export const listMedications = (ctx: Context): MedicationView[] => ctx.sql.all<MedicationRow>(SELECT).map(toView);

export function addMedication(ctx: Context, actor: Member, input: Record<string, unknown>): CommandResult<MedicationView> {
  const medication = normalizeMedication(input);
  if (!medication || typeof input.petId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM pets WHERE id = ? AND retired_at IS NULL', input.petId).length === 0) return failure('not_found');
  const id = ctx.ids.next();
  ctx.sql.run(
    `INSERT INTO medications (id, pet_id, name, dose, frequency, start_on, end_on, member_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.petId,
    medication.name,
    medication.dose,
    medication.frequency,
    medication.startOn,
    medication.endOn,
    actor.id,
    nowIso(ctx),
  );
  const value = listMedications(ctx).find((m) => m.id === id) as MedicationView;
  return { ok: true, value, changed: ['medications'] };
}

export function removeMedication(ctx: Context, _actor: Member, input: Record<string, unknown>): CommandResult<null> {
  if (typeof input.medicationId !== 'string') return failure('invalid');
  if (ctx.sql.all('SELECT 1 FROM medications WHERE id = ?', input.medicationId).length === 0) return failure('not_found');
  ctx.sql.run('DELETE FROM medications WHERE id = ?', input.medicationId);
  return { ok: true, value: null, changed: ['medications'] };
}
