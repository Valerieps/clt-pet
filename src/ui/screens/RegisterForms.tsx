// The forms behind Registrar (docs/spec/navegacao.md): weight and vaccine, shown inside the drawer.
import { useState, type FormEvent } from 'react';
import type { PetView } from '../../application/api-contract';
import { TEXT_MAX } from '../../domain/pets/pet';
import { parseKilos } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { DEFAULT_INTERVAL_DAYS, MAX_INTERVAL_DAYS, PROTOCOLS } from '../../domain/vaccines/vaccine';
import { useServices } from '../backend-context';
import { todayLocal } from '../chefia';
import { useToast } from '../toast';

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
      <div>
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
  const [together, setTogether] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const others = allPets.filter((p) => p.id !== pet.id);

  async function submit(event: FormEvent) {
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
      onSaved();
    } else {
      setError(result.error === 'invalid' ? vaccineT.form.invalid : strings.genericError);
    }
  }

  const toggle = (id: string) => setTogether((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <form className="stack" onSubmit={submit}>
      <label>
        {vaccineT.form.vaccine}
        <input required autoFocus list={`protocol-${pet.id}`} maxLength={TEXT_MAX} value={vaccine} onChange={(e) => setVaccine(e.target.value)} />
        <datalist id={`protocol-${pet.id}`}>
          {PROTOCOLS[pet.species].map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </label>
      <label>
        {vaccineT.form.appliedOn}
        <input required type="date" max={today} value={appliedOn} onChange={(e) => setAppliedOn(e.target.value)} />
      </label>
      <label>
        {vaccineT.form.interval}
        <input required type="number" min={1} max={MAX_INTERVAL_DAYS} step={1} value={interval} onChange={(e) => setInterval(e.target.value)} />
      </label>
      {others.length > 0 && (
        <fieldset>
          <legend>{vaccineT.form.together}</legend>
          {others.map((p) => (
            <label key={p.id} className="row">
              <input type="checkbox" checked={together.includes(p.id)} onChange={() => toggle(p.id)} />
              {p.profile.name}
            </label>
          ))}
        </fieldset>
      )}
      <details>
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
      <div>
        <button type="submit">{vaccineT.form.add}</button>
      </div>
    </form>
  );
}
