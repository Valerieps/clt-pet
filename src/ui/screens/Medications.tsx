import { useState, type ReactNode } from 'react';
import type { MedicationView, PetView } from '../../application/api-contract';
import { isEnded } from '../../domain/medications/medication';
import { formatDate } from '../../domain/pets/pet';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { todayLocal } from '../chefia';
import { useConfirm } from '../confirm';
import { useQuery } from '../use-query';

const t = strings.medications;

/** A chefe's medications: the ones in use first, the ended ones below (docs/spec/medicacoes.md). */
export function Medications({ pet, removable, action }: { pet: PetView; removable: boolean; action?: ReactNode }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const all = useQuery('medications', {}, ['medications', 'pets']);
  const mine = (all.data ?? []).filter((m) => m.petId === pet.id);
  const today = todayLocal();
  const current = mine.filter((m) => !isEnded(m, today));
  const ended = mine.filter((m) => isEnded(m, today)).reverse();
  const [error, setError] = useState<string | null>(null);

  async function remove(medicationId: string) {
    if (!(await confirm(t.removeConfirm))) return;
    const result = await backend.command('medication.remove', { medicationId });
    setError(result.ok ? null : strings.genericError);
  }

  const row = (m: MedicationView) => (
    <li key={m.id} className="card row">
      <span className="grow">
        <strong>{m.name}</strong> · {m.dose}
        <br />
        <span className="muted">
          {t.frequency[m.frequency]} · {t.since(formatDate(m.startOn))} · {m.endOn ? t.until(formatDate(m.endOn)) : t.continuous} · {t.by(m.byName)}
        </span>
      </span>
      {removable && (
        <button type="button" className="secondary danger" onClick={() => void remove(m.id)}>
          {t.remove}
        </button>
      )}
    </li>
  );

  return (
    <>
      <div className="spread">
        <h2>{t.title}</h2>
        {action}
      </div>
      {mine.length === 0 && <p>{t.empty}</p>}
      <ul className="list">{current.map(row)}</ul>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {ended.length > 0 && (
        <>
          <h3>{t.ended}</h3>
          <ul className="list">{ended.map(row)}</ul>
        </>
      )}
    </>
  );
}
