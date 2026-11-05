// Conditions, consultas, exames and laudos (docs/spec/saude.md). Clinical screens: no voice, no jokes.
import { useState, type FormEvent } from 'react';
import type { PetView, VisitView } from '../../application/api-contract';
import { openReturns } from '../../domain/deadlines';
import { NOTES_MAX, VISIT_KINDS, type VisitKind } from '../../domain/health/health';
import { formatDate, TEXT_MAX } from '../../domain/pets/pet';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { todayLocal } from '../chefia';
import { useConfirm } from '../confirm';
import { useToast } from '../toast';
import { useQuery } from '../use-query';
import { Treatments } from './Medications';
import { Diary } from './Routine';

const t = strings.health;

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p className="notice" role="alert">
      {error}
    </p>
  ) : null;
}

/**
 * The Saúde tab (docs/spec/navegacao.md): conditions, treatments, consultas and exames, and "algo estranho
 * hoje". Fichas (conditions, treatments) get a button at the end of their section; acontecimentos come by the +.
 */
export function HealthPanel({ pet, editing }: { pet: PetView; editing: boolean }) {
  return (
    <>
      <Conditions pet={pet} removable={editing} />
      <Treatments pet={pet} removable={editing} />
      <Visits pet={pet} removable={editing} />
      <Diary pet={pet} removable={editing} />
    </>
  );
}

function Conditions({ pet, removable }: { pet: PetView; removable: boolean }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const all = useQuery('conditions', {}, ['conditions', 'pets']);
  const mine = (all.data ?? []).filter((c) => c.petId === pet.id);
  const active = mine.filter((c) => c.resolvedOn === null);
  const resolved = mine.filter((c) => c.resolvedOn !== null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(promise: Promise<{ ok: boolean }>) {
    const result = await promise;
    setError(result.ok ? null : strings.genericError);
  }
  async function remove(conditionId: string) {
    if (await confirm(t.removeConditionConfirm)) await run(backend.command('condition.remove', { conditionId }));
  }

  return (
    <section id="condicoes" className="stack">
      <h3>{strings.chefe.sections.conditions}</h3>
      {mine.length === 0 && <p className="muted">{t.conditionsEmpty}</p>}
      <ul className="list">
        {active.map((c) => (
          <li key={c.id} className="card">
            <strong>{c.name}</strong>
            {c.grave && <span data-status="overdue"> · {t.grave}</span>}
            {c.since && <span className="muted"> · {t.since(formatDate(c.since))}</span>}
            {c.notes && <p className="muted pre">{c.notes}</p>}
            <div className="row wrap">
              <button type="button" className="secondary" onClick={() => void run(backend.command('condition.resolve', { conditionId: c.id }))}>
                {t.resolve}
              </button>
              {removable && (
                <button type="button" className="secondary danger" onClick={() => void remove(c.id)}>
                  {t.remove}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {resolved.length > 0 && (
        <details className="fold">
          <summary>{t.resolved}</summary>
          <ul className="list">
            {resolved.map((c) => (
              <li key={c.id} className="card row">
                <span className="grow">
                  {c.name} <span className="muted">{t.resolvedOn(formatDate(c.resolvedOn!))}</span>
                </span>
                <button type="button" className="secondary" onClick={() => void run(backend.command('condition.resolve', { conditionId: c.id, resolvedOn: null }))}>
                  {t.reopen}
                </button>
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
      <ErrorLine error={error} />
      {adding ? (
        <ConditionForm pet={pet} onDone={() => setAdding(false)} />
      ) : (
        <div>
          <button type="button" className="secondary" onClick={() => setAdding(true)}>
            {t.addCondition}
          </button>
        </div>
      )}
    </section>
  );
}

function ConditionForm({ pet, onDone }: { pet: PetView; onDone: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const [name, setName] = useState('');
  const [grave, setGrave] = useState(false);
  const [since, setSince] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('condition.add', { petId: pet.id, name, grave, since: since || null, notes: notes || null });
    if (result.ok) {
      toast(strings.toast.condition(pet.profile.name));
      onDone();
    } else setError(result.error === 'invalid' ? t.conditionForm.invalid : strings.genericError);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>
        {t.conditionForm.name}
        <input required autoFocus maxLength={TEXT_MAX} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="row">
        <input type="checkbox" checked={grave} onChange={(e) => setGrave(e.target.checked)} />
        {t.conditionForm.grave}
      </label>
      <label>
        {t.conditionForm.since}
        <input type="date" max={todayLocal()} value={since} onChange={(e) => setSince(e.target.value)} />
      </label>
      <label>
        {t.conditionForm.notes}
        <textarea rows={3} maxLength={NOTES_MAX} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <ErrorLine error={error} />
      <div className="row">
        <button type="submit">{t.conditionForm.save}</button>
        <button type="button" className="secondary" onClick={onDone}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}

/** Upcoming consultas and open returns first; every consulta, exame and laudo folded below. */
function Visits({ pet, removable }: { pet: PetView; removable: boolean }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const all = useQuery('visits', {}, ['visits', 'pets']);
  const mine = (all.data ?? []).filter((v) => v.petId === pet.id);
  const today = todayLocal();
  const pending = new Set(openReturns(mine).map((v) => v.id));
  const current = mine.filter((v) => v.onDate > today || pending.has(v.id));
  const [error, setError] = useState<string | null>(null);

  async function remove(visitId: string) {
    if (!(await confirm(t.removeVisitConfirm))) return;
    const result = await backend.command('visit.remove', { visitId });
    setError(result.ok ? null : strings.genericError);
  }

  const card = (v: VisitView) => (
    <li key={v.id} className="card">
      <div className="row">
        <span className="grow">
          <strong>
            {t.kinds[v.kind]}: {v.title}
          </strong>{' '}
          · {formatDate(v.onDate)}
          {v.onDate > today && <span data-status="soon"> · {t.scheduled}</span>}
        </span>
        {removable && (
          <button type="button" className="secondary danger" onClick={() => void remove(v.id)}>
            {t.remove}
          </button>
        )}
      </div>
      <span className="muted">{[v.vet, v.returnOn && t.returnOn(formatDate(v.returnOn)), t.by(v.byName)].filter(Boolean).join(' · ')}</span>
      {v.notes && <p className="pre">{v.notes}</p>}
    </li>
  );

  return (
    <section id="consultas" className="stack">
      <h3>{strings.chefe.sections.visits}</h3>
      {mine.length === 0 && <p className="muted">{t.visitsEmpty}</p>}
      <ul className="list">{current.map(card)}</ul>
      <ErrorLine error={error} />
      {mine.length > 0 && (
        <details className="fold" open={removable || undefined}>
          <summary>{strings.chefe.history}</summary>
          <ul className="list">{[...mine].reverse().map(card)}</ul>
        </details>
      )}
    </section>
  );
}

/** Opened by the + only ("Consulta ou exame"). */
export function VisitForm({ pet, onSaved }: { pet: PetView; onSaved: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const [kind, setKind] = useState<VisitKind>('consulta');
  const [title, setTitle] = useState('');
  const [onDate, setOnDate] = useState(todayLocal());
  const [vet, setVet] = useState(pet.emergency.vetName ?? '');
  const [notes, setNotes] = useState('');
  const [returnOn, setReturnOn] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('visit.add', { petId: pet.id, kind, title, onDate, vet: vet || null, notes: notes || null, returnOn: returnOn || null });
    if (result.ok) {
      toast(strings.toast.visit(pet.profile.name));
      onSaved();
    } else setError(result.error === 'invalid' ? t.visitForm.invalid : strings.genericError);
  }

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="field">
        <legend>{t.visitForm.kind}</legend>
        <div className="chips">
          {VISIT_KINDS.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {t.kinds[k]}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        {t.visitForm.title}
        <input required maxLength={TEXT_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        {t.visitForm.onDate}
        <input required type="date" max={kind === 'consulta' ? undefined : todayLocal()} value={onDate} onChange={(e) => setOnDate(e.target.value)} />
      </label>
      <label>
        {t.visitForm.vet}
        <input maxLength={TEXT_MAX} value={vet} onChange={(e) => setVet(e.target.value)} />
      </label>
      <label>
        {t.visitForm.notes}
        <textarea rows={4} maxLength={NOTES_MAX} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <label>
        {t.visitForm.returnOn}
        <input type="date" min={onDate} value={returnOn} onChange={(e) => setReturnOn(e.target.value)} />
      </label>
      <ErrorLine error={error} />
      <div className="form-actions">
        <button type="submit">{t.visitForm.save}</button>
      </div>
    </form>
  );
}
