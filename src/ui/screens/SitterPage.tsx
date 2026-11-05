// The page a pet sitter opens from the link (docs/spec/manual-temporario.md). No sign-in, read-only,
// sober like the Cartão de Saúde: safety information first.
import { useEffect, useState } from 'react';
import { sitterPhotoPath, type ApiError, type SitterManualView, type SitterPetView } from '../../application/api-contract';
import { mapsDirectionsHref, telHref } from '../../domain/pets/emergency';
import { formatDate } from '../../domain/pets/pet';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { PhoneIcon, WarningIcon } from '../parts';

const t = strings.sitter.page;

export function SitterPage({ token }: { token: string }) {
  const { backend } = useServices();
  const [manual, setManual] = useState<SitterManualView | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let current = true;
    void backend.sitterManual(token).then((result) => {
      if (!current) return;
      if (result.ok) setManual(result.value);
      else setError(result.error);
    });
    return () => {
      current = false;
    };
  }, [backend, token]);

  if (error) {
    return (
      <main className="sheet">
        <h1>{strings.sitter.title}</h1>
        <p className="notice" role="alert">
          {error === 'not_found' ? t.gone : strings.genericError}
        </p>
      </main>
    );
  }
  if (!manual) return <div className="skeleton" role="status" aria-label={t.loading} />;

  return (
    <main className="sheet stack" style={{ gap: 20 }}>
      <header>
        <p className="lbl">{strings.sitter.title}</p>
        <h1>{t.hello(manual.label)}</h1>
        <p>{t.intro}</p>
        <p className="meta">{t.until(formatDate(manual.expiresOn))}</p>
      </header>
      {manual.note && (
        <section>
          <h2>{t.notes}</h2>
          <p className="pre">{manual.note}</p>
        </section>
      )}
      {manual.tutors.length > 0 && (
        <section>
          <h2>{t.tutors}</h2>
          <p>{manual.tutors.join(', ')}</p>
        </section>
      )}
      {manual.pets.map((pet) => (
        <PetCard key={pet.id} token={token} pet={pet} />
      ))}
    </main>
  );
}

function PetCard({ token, pet }: { token: string; pet: SitterPetView }) {
  const { emergency, food } = pet;
  const foodText = [food.kind && strings.pets.profile.foodKindOptions[food.kind], food.brand, food.daily].filter(Boolean).join(' · ');
  return (
    <section className="card stack">
      <div className="manual-who">
        {pet.photoVersion && <img className="pet-photo" src={sitterPhotoPath(token, pet.id, pet.photoVersion)} alt="" width={64} height={64} />}
        <div>
          <h2 style={{ margin: 0 }}>{pet.name}</h2>
          <p className="meta">
            {strings.pets.species[pet.species]}
            {pet.tags.length > 0 && ` · ${pet.tags.join(' · ')}`}
          </p>
          {pet.microchip && (
            <p className="meta">
              {t.microchip}: {pet.microchip}
            </p>
          )}
        </div>
      </div>

      {pet.allergies.length > 0 || pet.graveConditions.length > 0 ? (
        <div className="allergy" role="region" aria-label={t.allergies}>
          {pet.allergies.map((a, i) => (
            <p key={`a${i}`} className="allergy-line">
              <WarningIcon />
              {strings.sos.allergy(strings.pets.allergyKind[a.kind], a.description)}
            </p>
          ))}
          {pet.graveConditions.map((c, i) => (
            <p key={`c${i}`} className="allergy-line">
              <WarningIcon />
              {c.notes ? `${c.name}: ${c.notes}` : c.name}
            </p>
          ))}
        </div>
      ) : (
        <p className="meta">{t.noAllergies}</p>
      )}

      <div>
        <h3>{t.food}</h3>
        {foodText && <p>{foodText}</p>}
        {pet.meals.length === 0 ? (
          <p className="muted">{t.noMeals}</p>
        ) : (
          <ul className="list">
            {pet.meals.map((m) => (
              <li key={m.id}>
                <strong>{m.at}</strong> {[m.amount, m.note].filter(Boolean).join(' · ')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="stack">
        <h3>{t.emergency}</h3>
        {emergency.vetPhone && (
          <a className="call" href={telHref(emergency.vetPhone)}>
            <PhoneIcon />
            <span>
              <strong>{strings.sos.callVet(emergency.vetName)}</strong>
              <small>{emergency.vetPhone}</small>
            </span>
          </a>
        )}
        {emergency.clinicPhone && (
          <a className="call alt" href={telHref(emergency.clinicPhone)}>
            <PhoneIcon />
            <span>
              <strong>{strings.sos.callClinic(emergency.clinicName)}</strong>
              <small className="meta">{emergency.clinicPhone}</small>
            </span>
          </a>
        )}
        {emergency.clinicAddress && (
          <p>
            <a href={mapsDirectionsHref(emergency.clinicAddress)} target="_blank" rel="noopener noreferrer">
              {strings.sos.address(emergency.clinicAddress)}
            </a>
          </p>
        )}
        {(emergency.planName || emergency.planNumber) && (
          <p>
            {t.plan}: {strings.sos.planLine(emergency.planName, emergency.planNumber)}
          </p>
        )}
      </div>
    </section>
  );
}
