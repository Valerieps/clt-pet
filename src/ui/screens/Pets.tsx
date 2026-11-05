import { useState, type FormEvent } from 'react';
import { PET_NAME_MAX, type Species } from '../../domain/pets/pet';
import { latestWeight, formatKilos } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { PetPhoto } from '../PetPhoto';
import { Link } from '../router';
import { useToast } from '../toast';
import { useQuery } from '../use-query';

const t = strings.pets;

export function Pets() {
  const pets = useQuery('pets', {}, ['pets']);
  const retired = useQuery('retiredPets', {}, ['pets']);
  return (
    <section className="stack">
      <h1>{t.title}</h1>
      {pets.error && !pets.data && <p className="notice">{strings.genericError}</p>}
      {pets.data?.length === 0 && <p className="muted">{t.empty}</p>}
      <ul className="list">
        {pets.data?.map((pet) => {
          const latest = latestWeight(pet.weights);
          return (
            <li key={pet.id} className="card pet-header">
              <PetPhoto pet={pet} small />
              <div>
                <Link to={`/chefes/${pet.id}`}>
                  <strong>{pet.profile.name}</strong>
                </Link>{' '}
                <span className="muted">{t.species[pet.species]}</span>
                <br />
                <span className="muted">
                  {pet.tutorName ? t.tutor(pet.tutorName) : t.tutorPending(pet.tutorEmail)}
                  {' · '}
                  {latest ? t.currentWeight(formatKilos(latest.grams)) : t.noWeight}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <Admission />
      {(retired.data?.length ?? 0) > 0 && (
        <section className="stack">
          <h2>{t.retire.listTitle}</h2>
          <ul className="list">
            {retired.data!.map((r) => (
              <li key={r.id} className="card muted">
                {t.retire.line(r.name, r.arrivedOn.slice(0, 4), r.retiredOn.slice(0, 4))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

/** The Exame Admissional (docs/spec/chefes.md): a new chefe with only the name and the species. */
function Admission() {
  const toast = useToast();
  const { backend } = useServices();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('cat');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('pet.create', { name, species });
    if (result.ok) {
      toast(t.admission.done(result.value.profile.name));
      setName('');
      setOpen(false);
      setError(null);
    } else setError(result.error === 'invalid' ? t.admission.invalid : strings.genericError);
  }

  if (!open) {
    return (
      <div>
        <button type="button" className="secondary" onClick={() => setOpen(true)}>
          {t.admission.title}
        </button>
      </div>
    );
  }
  return (
    <form className="stack" onSubmit={submit}>
      <h2>{t.admission.title}</h2>
      <p className="muted">{t.admission.explain}</p>
      <label>
        {t.admission.name}
        <input required autoFocus maxLength={PET_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <fieldset className="field">
        <legend>{t.admission.species}</legend>
        <div className="chips">
          {(['cat', 'dog'] as const).map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={species === s} onClick={() => setSpecies(s)}>
              {t.species[s]}
            </button>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="submit">{t.admission.save}</button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          {t.profile.cancel}
        </button>
      </div>
    </form>
  );
}
