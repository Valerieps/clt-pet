// The forms behind Registrar (docs/spec/navegacao.md): weight and vaccine, shown inside the drawer.
import { useState, type FormEvent } from 'react';
import type { PetView } from '../../application/api-contract';
import { TEXT_MAX } from '../../domain/pets/pet';
import { parseKilos } from '../../domain/pets/weight';
import { sameItem } from '../../domain/prazos';
import { strings } from '../../domain/strings';
import { DEFAULT_INTERVAL_DAYS, MAX_INTERVAL_DAYS, PROTOCOLS } from '../../domain/vaccines/vaccine';
import { useServices } from '../backend-context';
import { todayLocal } from '../chefia';
import { useToast } from '../toast';
import { useQuery } from '../use-query';

const weightT = strings.pets.weight;
const vaccineT = strings.vaccines;

export function WeightForm({ pet, onSaved }: { pet: PetView; onSaved: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const [kilos, setKilos] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const grams = parseKilos(kilos);
    if (grams === null) return setError(weightT.invalid);
    const result = await backend.command('weight.add', { petId: pet.id, grams, onDate: date });
    if (result.ok) {
      toast(strings.toast.weight(pet.profile.name));
      onSaved();
    } else {
      setError(result.error === 'invalid' ? weightT.invalid : strings.genericError);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>
        {weightT.kilos}
        <input required autoFocus inputMode="decimal" value={kilos} onChange={(e) => setKilos(e.target.value)} />
      </label>
      <label>
        {weightT.date}
        <input required type="date" max={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit">{weightT.add}</button>
      </div>
    </form>
  );
}

export function VaccineForm({ pet, allPets, onSaved }: { pet: PetView; allPets: readonly PetView[]; onSaved: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const today = todayLocal();
  const [vaccine, setVaccine] = useState('');
  const [appliedOn, setAppliedOn] = useState(today);
  const [interval, setInterval] = useState(String(DEFAULT_INTERVAL_DAYS));
  const [lot, setLot] = useState('');
  const [maker, setMaker] = useState('');
  const [vet, setVet] = useState('');
  const [custom, setCustom] = useState(false);
  const [together, setTogether] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const others = allPets.filter((p) => p.id !== pet.id);
  const plans = useQuery('plans', {}, ['plans']);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!vaccine.trim()) return setError(vaccineT.form.pick);
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
      onSaved();
    } else {
      setError(result.error === 'invalid' ? vaccineT.form.invalid : strings.genericError);
    }
  }

  const pick = (name: string) => {
    setCustom(false);
    setVaccine(name);
    const plan = plans.data?.find((p) => p.petId === pet.id && p.kind === 'vaccine' && sameItem(p.item, name));
    if (plan) setInterval(String(plan.intervalDays));
    setError(null);
  };
  const toggle = (id: string) => setTogether((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="field">
        <legend>{vaccineT.form.vaccine}</legend>
        <div className="chips">
          {PROTOCOLS[pet.species].map((name) => (
            <button key={name} type="button" className="chip" aria-pressed={!custom && vaccine === name} onClick={() => pick(name)}>
              {name}
            </button>
          ))}
          <button type="button" className="chip" aria-pressed={custom} onClick={() => { setCustom(true); setVaccine(''); }}>
            {vaccineT.form.other}
          </button>
        </div>
        {custom && (
          <input required autoFocus aria-label={vaccineT.form.otherName} placeholder={vaccineT.form.otherName} maxLength={TEXT_MAX} value={vaccine} onChange={(e) => setVaccine(e.target.value)} />
        )}
      </fieldset>
      <label>
        {vaccineT.form.appliedOn}
        <input required type="date" max={today} value={appliedOn} onChange={(e) => setAppliedOn(e.target.value)} />
      </label>
      <label>
        {vaccineT.form.interval}
        <input required type="number" min={1} max={MAX_INTERVAL_DAYS} step={1} value={interval} onChange={(e) => setInterval(e.target.value)} />
      </label>
      {others.length > 0 && (
        <fieldset className="field">
          <legend>{vaccineT.form.together}</legend>
          <div className="chips">
            {others.map((p) => (
              <button key={p.id} type="button" className="chip" aria-pressed={together.includes(p.id)} onClick={() => toggle(p.id)}>
                {p.profile.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <details className="fold">
        <summary>{vaccineT.form.moreDetails}</summary>
        <div className="stack">
          <label>
            {vaccineT.form.lot}
            <input maxLength={TEXT_MAX} value={lot} onChange={(e) => setLot(e.target.value)} />
          </label>
          <label>
            {vaccineT.form.maker}
            <input maxLength={TEXT_MAX} value={maker} onChange={(e) => setMaker(e.target.value)} />
          </label>
          <label>
            {vaccineT.form.vet}
            <input maxLength={TEXT_MAX} value={vet} onChange={(e) => setVet(e.target.value)} />
          </label>
        </div>
      </details>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit">{vaccineT.form.add}</button>
      </div>
    </form>
  );
}
