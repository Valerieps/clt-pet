// The Cartão de Saúde / Cartão SOS (docs/spec/cartao-sos.md): a drawer that opens from the
// handle on every screen. Sober: no aura, no jokes. Neutral tone.
import { useState, type FormEvent } from 'react';
import type { PetView } from '../../application/api-contract';
import { EMERGENCY_ADDRESS_MAX, EMERGENCY_TEXT_MAX, formatPhone, mapsDirectionsHref, telHref } from '../../domain/pets/emergency';
import { formatKilos, latestWeight } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { useChefia } from '../chefia';
import { CloseIcon, Layer, PhoneIcon, WarningIcon, useEscape } from '../parts';
import { PetPhoto } from '../PetPhoto';
import { goBack, navigate } from '../router';

const t = strings.sos;

/** `petId` is the chefe of the screen below; without it, the first chefe. */
export function Manual({ petId }: { petId: string | null }) {
  const { chefes, loading, failed } = useChefia();
  const chefe = chefes.find((c) => c.pet.id === petId) ?? (petId ? undefined : chefes[0]);
  const close = () => goBack(chefe ? `/chefes/${chefe.pet.id}` : '/');
  useEscape(close);

  return (
    <Layer>
      <button type="button" className="scrim" aria-label={strings.nav.close} onClick={close} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label={strings.nav.manual}>
        <span className="grip" />
        <div className="spread">
          <h2>{strings.nav.manual}</h2>
          <button type="button" className="close" aria-label={strings.nav.close} onClick={close}>
            <CloseIcon />
          </button>
        </div>
        {failed && <p className="notice">{strings.genericError}</p>}
        {!loading && !failed && chefes.length === 0 && <p className="muted">{strings.pets.empty}</p>}
        {chefes.length > 1 && (
          <div className="chips">
            {chefes.map((c) => (
              <button
                key={c.pet.id}
                type="button"
                className="chip"
                aria-pressed={c.pet.id === chefe?.pet.id}
                onClick={() => navigate(`/sos/${c.pet.id}`, { replace: true })}
              >
                {c.pet.profile.name}
              </button>
            ))}
          </div>
        )}
        {petId && !chefe && !loading && <p className="notice">{strings.pets.notFound}</p>}
        {chefe && <Card key={chefe.pet.id} pet={chefe.pet} />}
      </div>
    </Layer>
  );
}

function Card({ pet }: { pet: PetView }) {
  const [editing, setEditing] = useState(false);
  const { profile, emergency } = pet;
  const latest = latestWeight(pet.weights);

  return (
    <>
      <div className="manual-who">
        <PetPhoto pet={pet} />
        <div>
          <p style={{ fontSize: 18, fontWeight: 700 }}>{profile.name}</p>
          <p className="meta">
            {strings.pets.species[pet.species]} · {latest ? t.weight(formatKilos(latest.grams)) : t.noWeight}
          </p>
          {profile.microchip && <p className="meta">{strings.pets.profile.microchip}: {profile.microchip}</p>}
        </div>
      </div>

      {profile.allergies.length > 0 ? (
        <div className="allergy" role="region" aria-label={t.allergies} style={{ marginBottom: 0 }}>
          {profile.allergies.map((a, i) => (
            <p key={i} className="allergy-line">
              <WarningIcon />
              {t.allergy(strings.pets.allergyKind[a.kind], a.description)}
            </p>
          ))}
        </div>
      ) : (
        <p className="meta">{t.noAllergies}</p>
      )}

      <dl className="kv">
        <dt>{t.plan}</dt>
        <dd>{emergency.planName || emergency.planNumber ? t.planLine(emergency.planName, emergency.planNumber) : t.noPlan}</dd>
      </dl>

      <div className="stack">
        {emergency.vetPhone ? (
          <a className="call" href={telHref(emergency.vetPhone)}>
            <PhoneIcon />
            <span>
              <strong>{t.callVet(emergency.vetName)}</strong>
              <small>{emergency.vetPhone}</small>
            </span>
          </a>
        ) : (
          <p className="muted">{t.noVet}</p>
        )}
        {emergency.clinicPhone ? (
          <a className="call alt" href={telHref(emergency.clinicPhone)}>
            <PhoneIcon />
            <span>
              <strong>{t.callClinic(emergency.clinicName)}</strong>
              <small className="meta">{emergency.clinicPhone}</small>
            </span>
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
