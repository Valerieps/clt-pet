import { useState } from 'react';
import type { MedicationView } from '../../application/api-contract';
import { isEnded } from '../../domain/medications/medication';
import { formatDate } from '../../domain/pets/pet';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { todayLocal } from '../use-pets';
import { useConfirm } from '../confirm';

const t = strings.medications;

/** A pet's treatments (docs/spec/medicacoes.md), inside Medicações in Agendamentos: those in use first, the ended ones folded. */
export function TreatmentList({ treatments, removable }: { treatments: readonly MedicationView[]; removable: boolean }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const today = todayLocal();
  const current = treatments.filter((m) => !isEnded(m, today));
  const ended = treatments.filter((m) => isEnded(m, today)).reverse();
  const [error, setError] = useState<string | null>(null);

  async function remove(medicationId: string) {
    if (!(await confirm(t.removeConfirm))) return;
    const result = await backend.command('medication.remove', { medicationId });
    setError(result.ok ? null : strings.genericError);
  }

  const row = (m: MedicationView) => (
    <li key={m.id} className="row">
      <span className="grow">
        <strong>{m.name}</strong> · {m.dose}
        <br />
        {t.frequency[m.frequency]} · {m.endOn ? t.until(formatDate(m.endOn)) : t.continuous}
        <br />
        <span className="meta">
          {t.since(formatDate(m.startOn))} · {t.by(m.byName)}
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
      <ul className="rows">{current.map(row)}</ul>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {ended.length > 0 && (
        <details className="fold" open={removable || undefined}>
          <summary>{t.ended}</summary>
          <ul className="rows">{ended.map(row)}</ul>
        </details>
      )}
    </>
  );
}
