// Parasites and hygiene (docs/spec/cuidados.md): the panel on the chefe's page and the Registrar form.
import { useState, type FormEvent, type ReactNode } from 'react';
import type { CareView, PetView } from '../../application/api-contract';
import { CARE_CATEGORIES, CARE_NOTE_MAX, CARE_TEMPLATES, careDueDate, careStatus, currentCare, type CareCategory } from '../../domain/care/care';
import { formatDate, TEXT_MAX } from '../../domain/pets/pet';
import { strings } from '../../domain/strings';
import { MAX_INTERVAL_DAYS } from '../../domain/vaccines/vaccine';
import { useServices } from '../backend-context';
import { todayLocal, type Chefe } from '../chefia';
import { useConfirm } from '../confirm';
import { useToast } from '../toast';

const t = strings.care;

export function CarePanel({ chefe, removable, action }: { chefe: Chefe; removable: boolean; action?: ReactNode }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const [error, setError] = useState<string | null>(null);
  const today = todayLocal();

  async function remove(careId: string) {
    if (!(await confirm(t.removeConfirm))) return;
    const result = await backend.command('care.remove', { careId });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <div id="cuidados" className="stack">
      {CARE_CATEGORIES.map((category, index) => {
        const records = chefe.care.filter((c) => c.category === category);
        return (
          <section key={category} className="stack">
            <div className="spread">
              <h2>{t.categories[category]}</h2>
              {index === 0 && action}
            </div>
            {records.length === 0 && <p className="muted">{t.empty[category]}</p>}
            <ul className="list">
              {currentCare(records).map((c) => {
                const status = careStatus(c, today);
                return (
                  <li key={c.id} className="card">
                    <strong>{c.item}</strong> · <span data-status={status}>{t.status[status]}</span>
                    <br />
                    <span className="muted">
                      {t.done(formatDate(c.doneOn))} · {t.next(formatDate(careDueDate(c)))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {chefe.care.length > 0 && (
        <details className="fold">
          <summary>{t.history}</summary>
          <ul className="list">
            {[...chefe.care].reverse().map((c: CareView) => (
              <li key={c.id} className="card row">
                <span className="grow">
                  {c.item} · {formatDate(c.doneOn)} <span className="muted">{[c.note, t.by(c.byName)].filter(Boolean).join(' · ')}</span>
                </span>
                {removable && (
                  <button type="button" className="secondary danger" onClick={() => void remove(c.id)}>
                    {t.remove}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function CareForm({ pet, allPets, onSaved }: { pet: PetView; allPets: readonly PetView[]; onSaved: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const today = todayLocal();
  const [category, setCategory] = useState<CareCategory>('parasite');
  const [item, setItem] = useState('');
  const [custom, setCustom] = useState(false);
  const [doneOn, setDoneOn] = useState(today);
  const [interval, setInterval] = useState('30');
  const [note, setNote] = useState('');
  // Only chefes of the same species share the templates; any chefe may still be added.
  const [together, setTogether] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const others = allPets.filter((p) => p.id !== pet.id);

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
      toast(strings.toast.care(pet.profile.name));
      onSaved();
    } else setError(result.error === 'invalid' ? t.form.invalid : strings.genericError);
  }

  const pick = (name: string, days: number) => {
    setCustom(false);
    setItem(name);
    setInterval(String(days));
    setError(null);
  };
  const toggle = (id: string) => setTogether((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="field">
        <legend>{t.form.category}</legend>
        <div className="chips">
          {CARE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                setItem('');
                setCustom(false);
              }}
            >
              {t.categories[c]}
            </button>
          ))}
        </div>
      </fieldset>
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
