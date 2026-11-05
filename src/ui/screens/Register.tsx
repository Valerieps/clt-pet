import { useState } from 'react';
import { dueLabel } from '../../domain/navigation';
import { formatKilos, latestWeight } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { useChefia } from '../chefia';
import { ChevronLeftIcon, CloseIcon, Layer, useEscape } from '../parts';
import { goBack } from '../router';
import { CareForm } from './Care';
import { VisitForm } from './Health';
import { VaccineForm, WeightForm } from './RegisterForms';
import { DiaryForm } from './Routine';

const t = strings.register;

type Step = 'menu' | 'weight' | 'vaccine' | 'care' | 'diary' | 'visit';

/** The hash the speed dial opens the drawer with, per form. */
const STEP_OF_HASH: Record<string, Step | undefined> = { vacina: 'vaccine', peso: 'weight', cuidado: 'care', diario: 'diary', consulta: 'visit' };

/** What can be registered for a chefe (docs/spec/navegacao.md). Every form opens right here. */
export function RegisterDrawer({ petId }: { petId: string }) {
  const { chefes } = useChefia();
  const [step, setStep] = useState<Step>(() => STEP_OF_HASH[window.location.hash.slice(1)] ?? 'menu');
  const chefe = chefes.find((c) => c.pet.id === petId);
  const close = () => goBack(`/chefes/${petId}`);
  useEscape(close);
  if (!chefe) return null;

  const { pet, status } = chefe;
  const latest = latestWeight(pet.weights);
  const allPets = chefes.map((c) => c.pet);
  const titles: Record<Step, string> = {
    menu: t.title(pet.profile.name),
    weight: t.weight,
    vaccine: t.vaccine,
    care: t.care,
    diary: t.diary,
    visit: t.visit,
  };
  return (
    <Layer>
      <button type="button" className="scrim" aria-label={strings.nav.close} onClick={close} />
      <div className="drawer floating" role="dialog" aria-modal="true" aria-label={t.button}>
        <span className="grip" />
        <div className="drawer-head">
          {step !== 'menu' && (
            <button type="button" className="close" aria-label={strings.nav.back} onClick={() => setStep('menu')}>
              <ChevronLeftIcon />
            </button>
          )}
          <h2>{titles[step]}</h2>
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
            <button type="button" className="item" onClick={() => setStep('care')}>
              <p>{t.care}</p>
              <span />
            </button>
            <button type="button" className="item" onClick={() => setStep('diary')}>
              <p>{t.diary}</p>
              <span />
            </button>
            <button type="button" className="item" onClick={() => setStep('visit')}>
              <p>{t.visit}</p>
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
        {step === 'weight' && <WeightForm pet={pet} onSaved={close} />}
        {step === 'vaccine' && <VaccineForm pet={pet} allPets={allPets} onSaved={close} />}
        {step === 'care' && <CareForm pet={pet} allPets={allPets} onSaved={close} />}
        {step === 'diary' && <DiaryForm pet={pet} onSaved={close} />}
        {step === 'visit' && <VisitForm pet={pet} onSaved={close} />}
      </div>
    </Layer>
  );
}
