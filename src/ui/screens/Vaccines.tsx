import { useState } from 'react';
import type { PetView, VaccinationView } from '../../application/api-contract';
import { formatDate } from '../../domain/pets/pet';
import { strings } from '../../domain/strings';
import {
  boosterDate,
  currentDoses,
  vaccineStatus,
} from '../../domain/vaccines/vaccine';
import { useServices } from '../backend-context';
import { useConfirm } from '../confirm';
import { useQuery } from '../use-query';

const t = strings.vaccines;
const todayLocal = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

export function Vaccines({ pet }: { pet: PetView }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const all = useQuery('vaccinations', {}, ['vaccinations', 'pets']);
  const doses = (all.data ?? []).filter((v) => v.petId === pet.id);
  const today = todayLocal();
  const [error, setError] = useState<string | null>(null);

  async function remove(vaccinationId: string) {
    if (!(await confirm(t.removeConfirm))) return;
    const result = await backend.command('vaccine.remove', { vaccinationId });
    setError(result.ok ? null : strings.genericError);
  }

  const describe = (d: VaccinationView) => [d.lot && `lote ${d.lot}`, d.maker, d.vet].filter(Boolean).join(' · ');

  return (
    <>
      <h2>{t.title}</h2>
      {doses.length === 0 && <p>{t.empty}</p>}
      <ul className="list">
        {currentDoses(doses).map((d) => {
          const status = vaccineStatus(d, today);
          return (
            <li key={d.id} className="card">
              <strong>{d.vaccine}</strong> · <span data-status={status}>{t.status[status]}</span>
              <br />
              <span className="muted">
                {t.applied(formatDate(d.appliedOn))} · {t.booster(formatDate(boosterDate(d)))}
              </span>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      {doses.length > 0 && (
        <>
          <h3>{t.history}</h3>
          <ul className="list">
            {[...doses].reverse().map((d) => (
              <li key={d.id} className="card row">
                <span className="grow">
                  {d.vaccine} · {formatDate(d.appliedOn)} <span className="muted">{[describe(d), t.by(d.byName)].filter(Boolean).join(' · ')}</span>
                </span>
                <button type="button" className="secondary danger" onClick={() => void remove(d.id)}>
                  {t.remove}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
