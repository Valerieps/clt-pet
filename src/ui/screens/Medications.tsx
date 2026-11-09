import { useState, type FormEvent } from 'react';
import type { MedicationView, PetView } from '../../application/api-contract';
import { FREQUENCIES, isEnded, type Frequency } from '../../domain/medications/medication';
import { formatDate, TEXT_MAX } from '../../domain/pets/pet';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { todayLocal } from '../use-pets';
import { useConfirm } from '../confirm';
import { useToast } from '../toast';
import { useQuery } from '../use-query';

const t = strings.medications;

/**
 * A pet's treatments, a ficha in the Saúde tab (docs/spec/medicacoes.md): the ones in use first, the
 * ended ones folded below, and "+ Novo tratamento" at the end. Until phase 3 they never come from the +.
 */
export function Treatments({ pet, removable }: { pet: PetView; removable: boolean }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const all = useQuery('medications', {}, ['medications', 'pets']);
  const mine = (all.data ?? []).filter((m) => m.petId === pet.id);
  const today = todayLocal();
  const current = mine.filter((m) => !isEnded(m, today));
  const ended = mine.filter((m) => isEnded(m, today)).reverse();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(medicationId: string) {
    if (!(await confirm(t.removeConfirm))) return;
    const result = await backend.command('medication.remove', { medicationId });
    setError(result.ok ? null : strings.genericError);
  }

  const row = (m: MedicationView) => (
    <li key={m.id} className="card row">
      <span className="grow">
        <strong>{m.name}</strong> · {m.dose}
        <br />
        <span className="muted">
          {t.frequency[m.frequency]} · {t.since(formatDate(m.startOn))} · {m.endOn ? t.until(formatDate(m.endOn)) : t.continuous} · {t.by(m.byName)}
        </span>
      </span>
      {removable && (
        <button type="button" className="secondary danger" onClick={() => void remove(m.id)}>
          {t.remove}
        </button>
      )}
    </li>
  );

  return (
    <section id="tratamentos" className="stack">
      <h3>{strings.petPage.sections.treatments}</h3>
      {mine.length === 0 && <p className="muted">{t.empty}</p>}
      <ul className="list">{current.map(row)}</ul>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {ended.length > 0 && (
        <details className="fold" open={removable || undefined}>
          <summary>{t.ended}</summary>
          <ul className="list">{ended.map(row)}</ul>
        </details>
      )}
      {adding ? (
        <MedicationForm pet={pet} onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
      ) : (
        <div>
          <button type="button" className="secondary" onClick={() => setAdding(true)}>
            {t.add}
          </button>
        </div>
      )}
    </section>
  );
}

function MedicationForm({ pet, onSaved, onCancel }: { pet: PetView; onSaved: () => void; onCancel: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState<Frequency | null>(null);
  const [startOn, setStartOn] = useState(todayLocal());
  const [endOn, setEndOn] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!frequency) return setError(t.form.frequency);
    const result = await backend.command('medication.add', { petId: pet.id, name, dose, frequency, startOn, endOn: endOn || null });
    if (result.ok) {
      toast(strings.toast.treatment(pet.profile.name));
      onSaved();
    } else {
      setError(result.error === 'invalid' ? t.form.invalid : strings.genericError);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>
        {t.form.name}
        <input required autoFocus maxLength={TEXT_MAX} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t.form.dose}
        <input required maxLength={TEXT_MAX} placeholder={t.form.dosePlaceholder} value={dose} onChange={(e) => setDose(e.target.value)} />
      </label>
      <fieldset className="field">
        <legend>{t.form.frequency}</legend>
        <div className="chips">
          {FREQUENCIES.map((key) => (
            <button
              key={key}
              type="button"
              className="chip"
              aria-pressed={frequency === key}
              onClick={() => {
                setFrequency(key);
                setError(null);
              }}
            >
              {t.frequency[key]}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        {t.form.startOn}
        <input required type="date" value={startOn} onChange={(e) => setStartOn(e.target.value)} />
      </label>
      <label>
        {t.form.endOn}
        <input type="date" min={startOn} value={endOn} onChange={(e) => setEndOn(e.target.value)} />
        <span className="muted">{t.form.endHint}</span>
      </label>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="submit">{t.form.add}</button>
        <button type="button" className="secondary" onClick={onCancel}>
          {strings.health.cancel}
        </button>
      </div>
    </form>
  );
}
