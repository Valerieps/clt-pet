import { useState, type FormEvent } from 'react';
import type { MeView, PetView, VaccinationView } from '../../application/api-contract';
import { greetingFor } from '../../domain/greeting';
import { NAME_MAX_LENGTH } from '../../domain/group/profile';
import { dailyPhrase, muralStatus, splitByTutor } from '../../domain/mural';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { PetPhoto } from '../PetPhoto';
import { Link } from '../router';
import { useQuery } from '../use-query';
import { PushToggle } from './PushToggle';

const t = strings.mural;
const todayLocal = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

/** The home screen (docs/spec/mural.md): one card per chefe, "Meus chefes" first. */
export function Mural({ me }: { me: MeView }) {
  const pets = useQuery('pets', {}, ['pets']);
  const vaccinations = useQuery('vaccinations', {}, ['vaccinations', 'pets']);
  const today = todayLocal();
  const { mine, others } = splitByTutor(pets.data ?? [], me.id);
  const doses = vaccinations.data ?? [];

  return (
    <section>
      <h1>{t.greeting(greetingFor(new Date()), me.name)}</h1>
      {pets.error && !pets.data && <p className="notice">{strings.genericError}</p>}
      {pets.data?.length === 0 && <p className="muted">{t.empty}</p>}
      <PetCards title={t.mine} pets={mine} doses={doses} today={today} />
      <PetCards title={t.others} pets={others} doses={doses} today={today} />
      <Account me={me} />
    </section>
  );
}

function PetCards({ title, pets, doses, today }: { title: string; pets: readonly PetView[]; doses: readonly VaccinationView[]; today: string }) {
  if (pets.length === 0) return null;
  return (
    <>
      <h2>{title}</h2>
      <ul className="list">
        {pets.map((pet) => {
          const forMural = { id: pet.id, name: pet.profile.name, seriousMode: pet.seriousMode, allergiesAnswered: pet.allergiesAnswered };
          const status = muralStatus(forMural, doses.filter((d) => d.petId === pet.id), today);
          const phrase = dailyPhrase(forMural, status, today);
          return (
            <li key={pet.id} className="card pet-header">
              <PetPhoto pet={pet} />
              <div className="grow">
                <Link to={`/chefes/${pet.id}`}>
                  <strong>{pet.profile.name}</strong>
                </Link>{' '}
                <span data-status={status.needsAttention ? 'overdue' : undefined}>{status.needsAttention ? t.needsAttention : t.allGood}</span>
                {status.allergiesMissing && <p className="muted">{t.allergiesMissing}</p>}
                {phrase && <p>{phrase}</p>}
                <Link to={`/sos/${pet.id}`}>{t.sos}</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Account({ me }: { me: MeView }) {
  const { backend } = useServices();
  const [name, setName] = useState(me.name);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('member.rename', { name });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <details>
      <summary>{t.account}</summary>
      <form className="row" onSubmit={submit}>
        <label className="grow">
          <span className="muted">{t.nameLabel}</span>
          <input required maxLength={NAME_MAX_LENGTH} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit">{t.save}</button>
      </form>
      <PushToggle />
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
