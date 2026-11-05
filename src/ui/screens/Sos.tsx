// The Cartão SOS (docs/spec/cartao-sos.md): the SOS button opens the list of chefes, one more tap
// opens the chefe's card. Neutral tone, no jokes.
import { useState, type FormEvent } from 'react';
import type { PetView } from '../../application/api-contract';
import { EMERGENCY_ADDRESS_MAX, EMERGENCY_TEXT_MAX, formatPhone, mapsDirectionsHref, telHref } from '../../domain/pets/emergency';
import { formatKilos, latestWeight } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { PetPhoto } from '../PetPhoto';
import { Link } from '../router';
import { useQuery } from '../use-query';

const t = strings.sos;

export function SosList() {
  const pets = useQuery('pets', {}, ['pets']);
  return (
    <section>
      <h1>{t.title}</h1>
      <p>{t.pick}</p>
      {pets.error && !pets.data && <p className="notice">{strings.genericError}</p>}
      <ul className="list">
        {pets.data?.map((pet) => (
          <li key={pet.id} className="card">
            <Link to={`/sos/${pet.id}`}>
              <strong>{pet.profile.name}</strong>
            </Link>{' '}
            <span className="muted">{strings.pets.species[pet.species]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SosCard({ petId }: { petId: string }) {
  const pets = useQuery('pets', {}, ['pets']);
  const pet = pets.data?.find((p) => p.id === petId);
  return (
    <section>
      <p>
        <Link to="/sos">{t.back}</Link>
      </p>
      {pets.error && !pets.data && <p className="notice">{strings.genericError}</p>}
      {pets.data && !pet && <p className="notice">{strings.pets.notFound}</p>}
      {pet && <Card pet={pet} />}
    </section>
  );
}

function Card({ pet }: { pet: PetView }) {
  const [editing, setEditing] = useState(false);
  const { profile, emergency } = pet;
  const latest = latestWeight(pet.weights);

  return (
    <>
      <div className="pet-header">
        <PetPhoto pet={pet} />
        <h1>
          {t.title}: {profile.name}
        </h1>
      </div>
      <p>{latest ? t.weight(formatKilos(latest.grams)) : t.noWeight}</p>

      <div className="allergy" role="region" aria-label={t.allergies}>
        <h2>{t.allergies}</h2>
        {profile.allergies.length === 0 ? (
          <p>{t.noAllergies}</p>
        ) : (
          <ul>
            {profile.allergies.map((a, i) => (
              <li key={i}>{t.allergy(strings.pets.allergyKind[a.kind], a.description)}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="stack">
        {emergency.vetPhone ? (
          <a className="button" href={telHref(emergency.vetPhone)}>
            {t.callVet(emergency.vetName)}
          </a>
        ) : (
          <p className="muted">{t.noVet}</p>
        )}
        {emergency.clinicPhone ? (
          <a className="button" href={telHref(emergency.clinicPhone)}>
            {t.callClinic(emergency.clinicName)}
          </a>
        ) : (
          <p className="muted">{t.noClinic}</p>
        )}
        {emergency.clinicAddress && (
          <p>
            <a href={mapsDirectionsHref(emergency.clinicAddress)} target="_blank" rel="noopener noreferrer">
              {t.address(emergency.clinicAddress)}
            </a>
          </p>
        )}
      </div>

      <h2>{t.plan}</h2>
      <p>{emergency.planName || emergency.planNumber ? t.planLine(emergency.planName, emergency.planNumber) : t.noPlan}</p>

      {editing ? (
        <EmergencyForm pet={pet} onDone={() => setEditing(false)} />
      ) : (
        <button type="button" className="secondary" onClick={() => setEditing(true)}>
          {t.edit}
        </button>
      )}
    </>
  );
}

function EmergencyForm({ pet, onDone }: { pet: PetView; onDone: () => void }) {
  const { backend } = useServices();
  const { emergency } = pet;
  const [vetName, setVetName] = useState(emergency.vetName ?? '');
  const [vetPhone, setVetPhone] = useState(emergency.vetPhone ?? '');
  const [clinicName, setClinicName] = useState(emergency.clinicName ?? '');
  const [clinicPhone, setClinicPhone] = useState(emergency.clinicPhone ?? '');
  const [clinicAddress, setClinicAddress] = useState(emergency.clinicAddress ?? '');
  const [planName, setPlanName] = useState(emergency.planName ?? '');
  const [planNumber, setPlanNumber] = useState(emergency.planNumber ?? '');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('pet.setEmergency', { petId: pet.id, vetName, vetPhone, clinicName, clinicPhone, clinicAddress, planName, planNumber });
    if (result.ok) onDone();
    else setError(result.error === 'invalid' ? t.invalid : strings.genericError);
  }

  const field = (label: string, value: string, set: (v: string) => void, type?: string, max = EMERGENCY_TEXT_MAX) => (
    <label>
      {label}
      <input
        type={type}
        inputMode={type === 'tel' ? 'tel' : undefined}
        maxLength={max}
        value={value}
        onChange={(e) => set(e.target.value)}
        onPaste={
          type === 'tel'
            ? (e) => {
                // A pasted phone is recognized and formatted at once; typing is formatted on leaving the field.
                e.preventDefault();
                set(formatPhone(e.clipboardData.getData('text')));
              }
            : undefined
        }
        onBlur={type === 'tel' ? () => set(formatPhone(value)) : undefined}
      />
    </label>
  );

  return (
    <form className="stack" onSubmit={submit}>
      {field(t.vetName, vetName, setVetName)}
      {field(t.vetPhone, vetPhone, setVetPhone, 'tel')}
      {field(t.clinicName, clinicName, setClinicName)}
      {field(t.clinicPhone, clinicPhone, setClinicPhone, 'tel')}
      {field(t.clinicAddress, clinicAddress, setClinicAddress, undefined, EMERGENCY_ADDRESS_MAX)}
      {field(t.planName, planName, setPlanName)}
      {field(t.planNumber, planNumber, setPlanNumber)}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="submit">{t.save}</button>
        <button type="button" className="secondary" onClick={onDone}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
