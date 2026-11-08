// Parasites and hygiene (docs/spec/cuidados.md): the Registrar form behind "Medicação dada" and "Higiene feita".
// The current state lives in the Prazos tab (Prazos.tsx).
import { useState, type FormEvent } from 'react';
import type { PetView } from '../../application/api-contract';
import { CARE_NOTE_MAX, CARE_TEMPLATES, type CareCategory } from '../../domain/care/care';
import { TEXT_MAX } from '../../domain/pets/pet';
import { sameItem } from '../../domain/prazos';
import { strings } from '../../domain/strings';
import { MAX_INTERVAL_DAYS } from '../../domain/vaccines/vaccine';
import { useServices } from '../backend-context';
import { todayLocal } from '../chefia';
import { useToast } from '../toast';
import { useQuery } from '../use-query';

const t = strings.care;

/** One form per category: the + opens it already on parasites or on hygiene. */
export function CareForm({ category, pet, allPets, onSaved }: { category: CareCategory; pet: PetView; allPets: readonly PetView[]; onSaved: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const today = todayLocal();
  const [item, setItem] = useState('');
  const [custom, setCustom] = useState(false);
  const [doneOn, setDoneOn] = useState(today);
  const [interval, setInterval] = useState('30');
  const [note, setNote] = useState('');
  // Only chefes of the same species share the templates; any chefe may still be added.
  const [together, setTogether] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const others = allPets.filter((p) => p.id !== pet.id);
  // A planned item's interval is the default (docs/spec/prazos.md).
  const plans = useQuery('plans', {}, ['plans']);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!item.trim()) return setError(t.form.pick);
    const result = await backend.command('care.add', {
      petIds: [pet.id, ...together],
      category,
      item,
      doneOn,
      intervalDays: Number(interval),
      note: note || null,
    });
    if (result.ok) {
      toast(strings.toast[category](pet.profile.name));
      onSaved();
    } else setError(result.error === 'invalid' ? t.form.invalid : strings.genericError);
  }

  const pick = (name: string, days: number) => {
    const plan = plans.data?.find((p) => p.petId === pet.id && p.kind === category && sameItem(p.item, name));
    setCustom(false);
    setItem(name);
    setInterval(String(plan?.intervalDays ?? days));
    setError(null);
  };
  const toggle = (id: string) => setTogether((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="field">
        <legend>{t.form.item}</legend>
        <div className="chips">
          {CARE_TEMPLATES[category][pet.species].map((tpl) => (
            <button key={tpl.item} type="button" className="chip" aria-pressed={!custom && item === tpl.item} onClick={() => pick(tpl.item, tpl.intervalDays)}>
              {tpl.item}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            aria-pressed={custom}
            onClick={() => {
              setCustom(true);
              setItem('');
            }}
          >
            {t.form.other}
          </button>
        </div>
        {custom && (
          <input required autoFocus aria-label={t.form.otherName} placeholder={t.form.otherName} maxLength={TEXT_MAX} value={item} onChange={(e) => setItem(e.target.value)} />
        )}
      </fieldset>
      <label>
        {t.form.doneOn}
        <input required type="date" max={today} value={doneOn} onChange={(e) => setDoneOn(e.target.value)} />
      </label>
      <label>
        {t.form.interval}
        <input required type="number" min={1} max={MAX_INTERVAL_DAYS} step={1} value={interval} onChange={(e) => setInterval(e.target.value)} />
      </label>
      <label>
        {t.form.note}
        <input maxLength={CARE_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {others.length > 0 && (
        <fieldset className="field">
          <legend>{t.form.together}</legend>
          <div className="chips">
            {others.map((p) => (
              <button key={p.id} type="button" className="chip" aria-pressed={together.includes(p.id)} onClick={() => toggle(p.id)}>
                {p.profile.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="submit">{t.form.add}</button>
      </div>
    </form>
  );
}
