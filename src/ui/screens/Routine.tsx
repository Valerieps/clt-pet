// The meals and the chefe's diary (docs/spec/rotina.md).
import { useState, type FormEvent, type ReactNode } from 'react';
import type { PetView } from '../../application/api-contract';
import { formatDate, TEXT_MAX } from '../../domain/pets/pet';
import { DIARY_MAX } from '../../domain/routine/routine';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { todayLocal } from '../chefia';
import { useConfirm } from '../confirm';
import { useToast } from '../toast';
import { useQuery } from '../use-query';

const t = strings.routine;

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p className="notice" role="alert">
      {error}
    </p>
  ) : null;
}

/** "Ração seca · Golden · 60 g por dia", or null without food data. */
export function foodLine(pet: PetView): string | null {
  const { foodKind, foodBrand, foodDaily } = pet.profile;
  const parts = [foodKind && strings.pets.profile.foodKindOptions[foodKind], foodBrand, foodDaily].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function RoutinePanel({ pet, removable, action }: { pet: PetView; removable: boolean; action?: ReactNode }) {
  return (
    <div id="rotina" className="stack">
      <Meals pet={pet} removable={removable} action={action} />
      <Diary pet={pet} removable={removable} />
    </div>
  );
}

function Meals({ pet, removable, action }: { pet: PetView; removable: boolean; action?: ReactNode }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const all = useQuery('meals', {}, ['meals', 'pets']);
  const meals = (all.data ?? []).filter((m) => m.petId === pet.id);
  const food = foodLine(pet);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(mealId: string) {
    if (!(await confirm(t.removeMealConfirm))) return;
    const result = await backend.command('meal.remove', { mealId });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <section className="stack">
      <div className="spread">
        <h2>{t.mealsTitle}</h2>
        {action}
      </div>
      <p>
        {t.food}: {food ?? strings.pets.profile.notInformed}
      </p>
      {meals.length === 0 && <p className="muted">{t.mealsEmpty}</p>}
      <ul className="list">
        {meals.map((m) => (
          <li key={m.id} className="card row">
            <span className="grow">
              <strong>{m.at}</strong> {[m.amount, m.note].filter(Boolean).join(' · ')}
            </span>
            {removable && (
              <button type="button" className="secondary danger" onClick={() => void remove(m.id)}>
                {t.remove}
              </button>
            )}
          </li>
        ))}
      </ul>
      <ErrorLine error={error} />
      {adding ? (
        <MealForm pet={pet} onDone={() => setAdding(false)} />
      ) : (
        <div>
          <button type="button" className="secondary" onClick={() => setAdding(true)}>
            {t.addMeal}
          </button>
        </div>
      )}
    </section>
  );
}

function MealForm({ pet, onDone }: { pet: PetView; onDone: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const [at, setAt] = useState('08:00');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('meal.add', { petId: pet.id, at, amount: amount || null, note: note || null });
    if (result.ok) {
      toast(strings.toast.meal(pet.profile.name));
      onDone();
    } else setError(result.error === 'invalid' ? t.mealForm.invalid : strings.genericError);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>
        {t.mealForm.at}
        <input required type="time" value={at} onChange={(e) => setAt(e.target.value)} />
      </label>
      <label>
        {t.mealForm.amount}
        <input maxLength={TEXT_MAX} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label>
        {t.mealForm.note}
        <input maxLength={TEXT_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <ErrorLine error={error} />
      <div className="row">
        <button type="submit">{t.mealForm.save}</button>
        <button type="button" className="secondary" onClick={onDone}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

function Diary({ pet, removable }: { pet: PetView; removable: boolean }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const all = useQuery('diary', {}, ['diary', 'pets']);
  const entries = (all.data ?? []).filter((d) => d.petId === pet.id).reverse();
  const [error, setError] = useState<string | null>(null);

  async function remove(entryId: string) {
    if (!(await confirm(t.removeDiaryConfirm))) return;
    const result = await backend.command('diary.remove', { entryId });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <section className="stack">
      <h2>{t.diaryTitle}</h2>
      <DiaryForm pet={pet} />
      {entries.length === 0 && <p className="muted">{t.diaryEmpty}</p>}
      <ul className="list">
        {entries.map((d) => (
          <li key={d.id} className="card">
            <div className="row">
              <span className="grow muted">
                {formatDate(d.onDate)} · {t.by(d.byName)}
              </span>
              {removable && (
                <button type="button" className="secondary danger" onClick={() => void remove(d.id)}>
                  {t.remove}
                </button>
              )}
            </div>
            <p className="pre">{d.text}</p>
          </li>
        ))}
      </ul>
      <ErrorLine error={error} />
    </section>
  );
}

export function DiaryForm({ pet, onSaved }: { pet: PetView; onSaved?: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const [text, setText] = useState('');
  const [onDate, setOnDate] = useState(todayLocal());
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('diary.add', { petId: pet.id, text, onDate });
    if (result.ok) {
      toast(strings.toast.diary(pet.profile.name));
      setText('');
      setError(null);
      onSaved?.();
    } else setError(result.error === 'invalid' ? t.diaryForm.invalid : strings.genericError);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>
        {t.diaryForm.text}
        <textarea required rows={3} maxLength={DIARY_MAX} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <label>
        {t.diaryForm.onDate}
        <input required type="date" max={todayLocal()} value={onDate} onChange={(e) => setOnDate(e.target.value)} />
      </label>
      <ErrorLine error={error} />
      <div className="form-actions">
        <button type="submit">{t.diaryForm.save}</button>
      </div>
    </form>
  );
}
