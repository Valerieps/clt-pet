import { useState } from 'react';
import { dueLabel } from '../../domain/navigation';
import { formatKilos, latestWeight } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { useChefia } from '../chefia';
import { CloseIcon, Layer, useEscape } from '../parts';
import { goBack } from '../router';
import { MedicationForm, VaccineForm, WeightForm } from './RegisterForms';

const t = strings.register;

type Step = 'menu' | 'weight' | 'vaccine' | 'medication';

/** What can be registered for a chefe (docs/spec/navegacao.md). Vaccine and weight open their form right here. */
export function RegisterDrawer({ petId }: { petId: string }) {
  const { chefes } = useChefia();
  // The speed dial opens straight on a form: /registrar#vacina or /registrar#peso.
  const [step, setStep] = useState<Step>(() => {
    const hash = window.location.hash.slice(1);
    return hash === 'vacina' ? 'vaccine' : hash === 'peso' ? 'weight' : hash === 'medicacao' ? 'medication' : 'menu';
  });
  const chefe = chefes.find((c) => c.pet.id === petId);
  const close = () => goBack(`/chefes/${petId}`);
  useEscape(close);
  if (!chefe) return null;

  const { pet, status } = chefe;
  const latest = latestWeight(pet.weights);
  const title = step === 'weight' ? t.weight : step === 'vaccine' ? t.vaccine : step === 'medication' ? t.newMedication : t.title(pet.profile.name);
  return (
    <Layer>
      <button type="button" className="scrim" aria-label={strings.nav.close} onClick={close} />
      <div className="drawer floating" role="dialog" aria-modal="true" aria-label={t.button}>
        <span className="grip" />
        <div className="spread">
          <h2>{title}</h2>
          <button type="button" className="close" aria-label={strings.nav.close} onClick={close}>
            <CloseIcon />
          </button>
        </div>
        {step === 'menu' && (
          <div>
            <button type="button" className="item" onClick={() => setStep('vaccine')}>
              <p>{t.vaccine}</p>
              <span className="meta">{status.vaccine ? `${status.vaccine.item} · ${dueLabel(status.vaccine.overdue, status.vaccine.days)}` : ''}</span>
            </button>
            <button type="button" className="item" onClick={() => setStep('weight')}>
              <p>{t.weight}</p>
              <span className="meta">{latest ? t.lastWeight(formatKilos(latest.grams)) : t.noWeight}</span>
            </button>
            <button type="button" className="item" onClick={() => setStep('medication')}>
              <p>{t.newMedication}</p>
              <span />
            </button>
            {t.soon.map((item) => (
              <div key={item.label} className="item" aria-disabled="true">
                <p>
                  {item.label}
                  <span className="phase">{item.phase}</span>
                </p>
                <span />
              </div>
            ))}
          </div>
        )}
        {step !== 'menu' && (
          <>
            <button type="button" className="secondary" onClick={() => setStep('menu')}>
              {strings.nav.back}
            </button>
            {step === 'weight' && <WeightForm pet={pet} onSaved={close} />}
            {step === 'medication' && <MedicationForm pet={pet} onSaved={close} />}
            {step === 'vaccine' && <VaccineForm pet={pet} allPets={chefes.map((c) => c.pet)} onSaved={close} />}
          </>
        )}
      </div>
    </Layer>
  );
}
