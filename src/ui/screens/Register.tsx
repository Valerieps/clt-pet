import { useState } from 'react';
import { dueLabel } from '../../domain/navigation';
import { formatKilos, latestWeight } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { usePets } from '../use-pets';
import { ChevronLeftIcon, CloseIcon, Layer, useEscape } from '../parts';
import { REGISTER_OPTIONS, stepOfHash, type RegisterStep } from '../register-options';
import { goBack } from '../router';
import { CareForm } from './Care';
import { VisitForm } from './Health';
import { VaccineForm, WeightForm } from './RegisterForms';
import { DiaryForm } from './Routine';

const t = strings.register;

/**
 * The Registrar drawer (docs/spec/navegacao.md): the + opens it straight on a form. The menu is only
 * the fallback for a link without a form, and lists the same options as the +.
 */
export function RegisterDrawer({ petId }: { petId: string }) {
  const { summaries } = usePets();
  const [step, setStep] = useState<RegisterStep | null>(() => stepOfHash(window.location.hash));
  const summary = summaries.find((c) => c.pet.id === petId);
  const close = () => goBack(`/pets/${petId}`);
  useEscape(close);
  if (!summary) return null;

  const { pet, status } = summary;
  const latest = latestWeight(pet.weights);
  const allPets = summaries.map((c) => c.pet);
  const option = REGISTER_OPTIONS.find((o) => o.step === step);
  const meta: Partial<Record<RegisterStep, string>> = {
    vaccine: status.vaccine ? `${status.vaccine.item} · ${dueLabel(status.vaccine.overdue, status.vaccine.days)}` : '',
    weight: latest ? t.lastWeight(formatKilos(latest.grams)) : t.noWeight,
  };
  return (
    <Layer>
      <button type="button" className="scrim" aria-label={strings.nav.close} onClick={close} />
      <div className="drawer floating" role="dialog" aria-modal="true" aria-label={t.button}>
        <span className="grip" />
        <div className="drawer-head">
          {step && (
            <button type="button" className="close" aria-label={strings.nav.back} onClick={() => setStep(null)}>
              <ChevronLeftIcon />
            </button>
          )}
          <h2>{option ? option.label : t.title(pet.profile.name)}</h2>
          <button type="button" className="close" aria-label={strings.nav.close} onClick={close}>
            <CloseIcon />
          </button>
        </div>
        {!step && (
          <div>
            {REGISTER_OPTIONS.map((o) => (
              <button key={o.step} type="button" className="item" onClick={() => setStep(o.step)}>
                <p>{o.label}</p>
                <span className="meta">{meta[o.step] ?? ''}</span>
              </button>
            ))}
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
        {step === 'parasite' && <CareForm key="parasite" category="parasite" pet={pet} allPets={allPets} onSaved={close} />}
        {step === 'hygiene' && <CareForm key="hygiene" category="hygiene" pet={pet} allPets={allPets} onSaved={close} />}
        {step === 'diary' && <DiaryForm pet={pet} onSaved={close} />}
        {step === 'visit' && <VisitForm pet={pet} onSaved={close} />}
      </div>
    </Layer>
  );
}
