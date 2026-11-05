import { useState, type FormEvent } from 'react';
import type { PetView, VaccinationView } from '../../application/api-contract';
import { formatDate, TEXT_MAX } from '../../domain/pets/pet';
import { strings } from '../../domain/strings';
import {
  boosterDate,
  currentDoses,
  DEFAULT_INTERVAL_DAYS,
  MAX_INTERVAL_DAYS,
  PROTOCOLS,
  vaccineStatus,
} from '../../domain/vaccines/vaccine';
import { useServices } from '../backend-context';
import { useToast } from '../toast';
import { useQuery } from '../use-query';

const t = strings.vaccines;
const todayLocal = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

export function Vaccines({ pet, allPets }: { pet: PetView; allPets: readonly PetView[] }) {
  const toast = useToast();
  const { backend } = useServices();
  const all = useQuery('vaccinations', {}, ['vaccinations', 'pets']);
  const doses = (all.data ?? []).filter((v) => v.petId === pet.id);
  const today = todayLocal();

  const [vaccine, setVaccine] = useState('');
  const [appliedOn, setAppliedOn] = useState(today);
  const [interval, setInterval] = useState(String(DEFAULT_INTERVAL_DAYS));
  const [lot, setLot] = useState('');
  const [maker, setMaker] = useState('');
  const [vet, setVet] = useState('');
  const [together, setTogether] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const others = allPets.filter((p) => p.id !== pet.id);

  async function add(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('vaccine.add', {
      petIds: [pet.id, ...together],
      vaccine,
      appliedOn,
      intervalDays: Number(interval),
      lot: lot || null,
      maker: maker || null,
      vet: vet || null,
    });
    if (result.ok) {
      toast(strings.toast.vaccine(pet.profile.name));
      setVaccine('');
      setLot('');
      setMaker('');
      setVet('');
      setTogether([]);
      setError(null);
    } else {
      setError(result.error === 'invalid' ? t.form.invalid : strings.genericError);
    }
  }

  async function remove(vaccinationId: string) {
    if (!window.confirm(t.removeConfirm)) return;
    const result = await backend.command('vaccine.remove', { vaccinationId });
    setError(result.ok ? null : strings.genericError);
  }

  const toggle = (id: string) => setTogether((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
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

      <form className="stack" onSubmit={add}>
        <h3>{t.form.title}</h3>
        <label>
          {t.form.vaccine}
          <input required list={`protocol-${pet.id}`} maxLength={TEXT_MAX} value={vaccine} onChange={(e) => setVaccine(e.target.value)} />
          <datalist id={`protocol-${pet.id}`}>
            {PROTOCOLS[pet.species].map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <label>
          {t.form.appliedOn}
          <input required type="date" max={today} value={appliedOn} onChange={(e) => setAppliedOn(e.target.value)} />
        </label>
        <label>
          {t.form.interval}
          <input required type="number" min={1} max={MAX_INTERVAL_DAYS} step={1} value={interval} onChange={(e) => setInterval(e.target.value)} />
        </label>
        <label>
          {t.form.lot}
          <input maxLength={TEXT_MAX} value={lot} onChange={(e) => setLot(e.target.value)} />
        </label>
        <label>
          {t.form.maker}
          <input maxLength={TEXT_MAX} value={maker} onChange={(e) => setMaker(e.target.value)} />
        </label>
        <label>
          {t.form.vet}
          <input maxLength={TEXT_MAX} value={vet} onChange={(e) => setVet(e.target.value)} />
        </label>
        {others.length > 0 && (
          <fieldset>
            <legend>{t.form.together}</legend>
            {others.map((p) => (
              <label key={p.id} className="row">
                <input type="checkbox" checked={together.includes(p.id)} onChange={() => toggle(p.id)} />
                {p.profile.name}
              </label>
            ))}
          </fieldset>
        )}
        <div>
          <button type="submit">{t.form.add}</button>
        </div>
      </form>
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
