// The Agendamentos tab (docs/spec/prazos.md): vaccines, medications, hygiene and consultas, each item
// with its next date. Planning comes first: an item can be planned before it ever happened, and any
// item's next date can be moved. The last record shows small under each item; the history stays folded
// and quiet below. Medicações also holds the treatments (dose and frequency); Consultas holds the
// routine consultas, the scheduled ones and the returns.
import { useState, type FormEvent, type ReactNode } from 'react';
import type { PetView } from '../../application/api-contract';
import { CARE_TEMPLATES } from '../../domain/care/care';
import { FREQUENCIES, type Frequency } from '../../domain/medications/medication';
import { formatDate, TEXT_MAX } from '../../domain/pets/pet';
import { dueLabel } from '../../domain/due-text';
import { daysBetween } from '../../domain/reminders/reminders';
import {
  careOccurrences,
  currentPrazos,
  doseOccurrences,
  VISIT_TEMPLATES,
  visitOccurrences,
  type Occurrence,
  type Prazo,
  type PrazoKind,
} from '../../domain/prazos';
import { strings } from '../../domain/strings';
import { DEFAULT_INTERVAL_DAYS, MAX_INTERVAL_DAYS, PROTOCOLS } from '../../domain/vaccines/vaccine';
import { useServices } from '../backend-context';
import { todayLocal, type PetSummary } from '../use-pets';
import { useConfirm } from '../confirm';
import { useToast } from '../toast';
import { useQuery } from '../use-query';
import { SectionHead } from '../parts';
import { VisitList } from './Health';
import { TreatmentList } from './Medications';

const s = strings.petPage.sections;
const status = strings.care.status;
const t = strings.prazos;
const m = strings.medications;

export function AgendamentosPanel({ summary, editing }: { summary: PetSummary; editing: boolean }) {
  const today = todayLocal();
  const petId = summary.pet.id;
  const visits = (useQuery('visits', {}, ['visits', 'pets']).data ?? []).filter((v) => v.petId === petId);
  const treatments = (useQuery('medications', {}, ['medications', 'pets']).data ?? []).filter((x) => x.petId === petId);
  const care = (kind: 'parasite' | 'hygiene') => careOccurrences(summary.care.filter((c) => c.category === kind));
  return (
    <>
      <PrazoSection id="vacinas" kind="vaccine" title={s.vaccines} occurrences={doseOccurrences(summary.doses)} summary={summary} editing={editing} />
      <PrazoSection
        id="medicacoes"
        kind="parasite"
        title={s.parasites}
        occurrences={care('parasite')}
        summary={summary}
        editing={editing}
        extra={treatments.length}
      >
        <TreatmentList treatments={treatments} removable={editing} />
      </PrazoSection>
      <PrazoSection id="higiene" kind="hygiene" title={s.hygiene} occurrences={care('hygiene')} summary={summary} editing={editing} />
      <PrazoSection
        id="consultas"
        kind="visit"
        title={s.visits}
        occurrences={visitOccurrences(visits, summary.plans, today)}
        summary={summary}
        editing={editing}
        extra={visits.length}
      >
        <VisitList visits={visits} removable={editing} />
      </PrazoSection>
      <PrazosHistory summary={summary} editing={editing} />
    </>
  );
}

/** What the plan form starts with: empty for "+ Planejar", the item's current values for "Mudar data". */
interface Draft {
  readonly item: string;
  readonly dueOn: string;
  readonly intervalDays: number;
  readonly dose: string;
  /** "Mudar data" only moves the date of something planned: no treatment option. */
  readonly replanning: boolean;
}

interface SectionProps {
  readonly id: string;
  readonly kind: PrazoKind;
  readonly title: string;
  readonly occurrences: readonly Occurrence[];
  readonly summary: PetSummary;
  readonly editing: boolean;
  /** How many other things (treatments, visits) the section shows below its prazos. */
  readonly extra?: number;
  readonly children?: ReactNode;
}

const DEFAULT_INTERVALS: Record<PrazoKind, number> = { vaccine: DEFAULT_INTERVAL_DAYS, parasite: 30, hygiene: 30, visit: 365 };

function PrazoSection({ id, kind, title, occurrences, summary, editing, extra = 0, children }: SectionProps) {
  const today = todayLocal();
  const confirm = useConfirm();
  const { backend } = useServices();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prazos = currentPrazos(kind, occurrences, summary.plans, today).sort((a, b) => a.due.localeCompare(b.due));

  async function removePlan(planId: string) {
    if (!(await confirm(t.removePlanConfirm))) return;
    const result = await backend.command('plan.remove', { planId });
    setError(result.ok ? null : strings.genericError);
  }

  const empty = prazos.length === 0 && extra === 0;
  const add = () => setDraft({ item: '', dueOn: today, intervalDays: DEFAULT_INTERVALS[kind], dose: '', replanning: false });

  return (
    <section id={id} className="group">
      <SectionHead title={title}>
        {!empty && !draft && (
          <button type="button" className="text-link" aria-label={strings.petPage.addTo(title)} onClick={add}>
            {strings.petPage.add}
          </button>
        )}
      </SectionHead>
      {empty && !draft && (
        <p className="support">
          {t.nothingPlanned}{' '}
          <button type="button" className="text-link inline" onClick={add}>
            {t.plan[kind]}
          </button>
        </p>
      )}
      <ul className="rows">
        {prazos.map((p) => (
          <PrazoRow
            key={p.id}
            prazo={p}
            today={today}
            editing={editing}
            onReplan={() => setDraft({ item: p.item, dueOn: p.due, intervalDays: p.intervalDays, dose: p.dose ?? '', replanning: true })}
            onRemovePlan={() => void removePlan(p.planId!)}
          />
        ))}
      </ul>
      {children}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {draft && <PlanForm key={draft.item} kind={kind} pet={summary.pet} draft={draft} onDone={() => setDraft(null)} />}
    </section>
  );
}

const STATE_CLASS: Record<Prazo['state'], string> = { ok: 'ok', soon: 'soon', overdue: 'late' };

/**
 * One item: its name, when it comes next ("Próxima em 12 meses · anual") and its state as a dot and a word.
 * Tapping it opens the detail, with the full dates and "Mudar data" (docs/spec/prazos.md).
 */
function PrazoRow({ prazo: p, today, editing, onReplan, onRemovePlan }: { prazo: Prazo; today: string; editing: boolean; onReplan: () => void; onRemovePlan: () => void }) {
  const [open, setOpen] = useState(false);
  const days = daysBetween(today, p.due);
  return (
    <li>
      <button type="button" className="item" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>
          <p>
            {p.item}
            {p.dose && <span className="support"> · {p.dose}</span>}
          </p>
          <span className="support">{t.nextIn(dueLabel(days < 0, Math.abs(days)), t.every(p.intervalDays))}</span>
        </span>
        <span className={`state ${STATE_CLASS[p.state]}`}>{status[p.state]}</span>
      </button>
      {open && (
        <div className="detail">
          <p className="support">
            {t.next(formatDate(p.due))} · {p.lastOn ? t.last(formatDate(p.lastOn)) : t.never}
          </p>
          <div className="links">
            <button type="button" className="text-link" onClick={onReplan}>
              {t.replan}
            </button>
            {editing && p.planId && (
              <button type="button" className="text-link danger" onClick={onRemovePlan}>
                {t.removePlan}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** The templates of each kind for a species, with their default interval. */
function templates(kind: PrazoKind, pet: PetView): readonly { item: string; intervalDays: number }[] {
  if (kind === 'vaccine') return PROTOCOLS[pet.species].map((item) => ({ item, intervalDays: DEFAULT_INTERVAL_DAYS }));
  if (kind === 'visit') return VISIT_TEMPLATES;
  return CARE_TEMPLATES[kind][pet.species];
}

/** A medication either repeats every so many days (planned) or is a treatment taken daily (docs/spec/medicacoes.md). */
type MedicationFrequency = Frequency | 'periodic';

function PlanForm({ kind, pet, draft, onDone }: { kind: PrazoKind; pet: PetView; draft: Draft; onDone: () => void }) {
  const toast = useToast();
  const { backend } = useServices();
  const options = templates(kind, pet);
  const known = draft.item === '' || options.some((o) => o.item === draft.item);
  const medication = kind === 'parasite';
  const [item, setItem] = useState(draft.item);
  const [custom, setCustom] = useState(!known);
  const [dueOn, setDueOn] = useState(draft.dueOn);
  const [interval, setInterval] = useState(String(draft.intervalDays));
  const [dose, setDose] = useState(draft.dose);
  const [frequency, setFrequency] = useState<MedicationFrequency>('periodic');
  const [endOn, setEndOn] = useState('');
  const [together, setTogether] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pets = useQuery('pets', {}, ['pets']);
  const others = (pets.data ?? []).filter((p) => p.id !== pet.id);
  const treatment = medication && frequency !== 'periodic';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!item.trim()) return setError(t.form.pick);
    if (treatment) {
      const result = await backend.command('medication.add', { petId: pet.id, name: item, dose, frequency, startOn: dueOn, endOn: endOn || null });
      if (result.ok) {
        toast(strings.toast.treatment(pet.profile.name));
        onDone();
      } else setError(result.error === 'invalid' ? m.form.invalid : strings.genericError);
      return;
    }
    const input = { petIds: [pet.id, ...together], kind, item, dueOn, intervalDays: Number(interval), dose: medication ? dose || null : null };
    const result = await backend.command('plan.add', input);
    if (result.ok) {
      toast(t.saved(pet.profile.name));
      onDone();
    } else setError(result.error === 'invalid' ? t.form.invalid : strings.genericError);
  }

  const pick = (name: string, days: number) => {
    setCustom(false);
    setItem(name);
    setInterval(String(days));
    setError(null);
  };
  const toggle = (id: string) => setTogether((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const frequencies: readonly MedicationFrequency[] = draft.replanning ? ['periodic'] : ['periodic', ...FREQUENCIES];

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="field">
        <legend>{t.form.item[kind]}</legend>
        <div className="chips">
          {options.map((o) => (
            <button key={o.item} type="button" className="chip" aria-pressed={!custom && item === o.item} onClick={() => pick(o.item, o.intervalDays)}>
              {o.item}
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
          <input
            required
            autoFocus
            aria-label={t.form.otherName}
            placeholder={t.form.otherName}
            maxLength={TEXT_MAX}
            value={item}
            onChange={(e) => setItem(e.target.value)}
          />
        )}
      </fieldset>
      {medication && (
        <>
          <label>
            {treatment ? m.form.dose : t.form.dose}
            <input required={treatment} maxLength={TEXT_MAX} placeholder={m.form.dosePlaceholder} value={dose} onChange={(e) => setDose(e.target.value)} />
          </label>
          <fieldset className="field">
            <legend>{m.form.frequency}</legend>
            <div className="chips">
              {frequencies.map((key) => (
                <button key={key} type="button" className="chip" aria-pressed={frequency === key} onClick={() => setFrequency(key)}>
                  {key === 'periodic' ? t.form.periodic : m.frequency[key]}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}
      <label>
        {treatment ? m.form.startOn : t.form.dueOn}
        <input required type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
      </label>
      {treatment ? (
        <label>
          {m.form.endOn}
          <input type="date" min={dueOn} value={endOn} onChange={(e) => setEndOn(e.target.value)} />
          <span className="muted">{m.form.endHint}</span>
        </label>
      ) : (
        <label>
          {t.form.interval}
          <input required type="number" min={1} max={MAX_INTERVAL_DAYS} step={1} value={interval} onChange={(e) => setInterval(e.target.value)} />
        </label>
      )}
      {!treatment && others.length > 0 && (
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
        <button type="button" className="secondary" onClick={onDone}>
          {t.form.cancel}
        </button>
        <button type="submit">{t.form.save}</button>
      </div>
    </form>
  );
}

interface HistoryRow {
  readonly id: string;
  readonly kind: 'vaccine' | 'care';
  readonly name: string;
  readonly on: string;
  readonly detail: string;
}

/** Every vaccine dose and care record, newest first, folded and small; the remove buttons show only while editing. */
function PrazosHistory({ summary, editing }: { summary: PetSummary; editing: boolean }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const [error, setError] = useState<string | null>(null);
  const v = strings.vaccines;
  const rows: HistoryRow[] = [
    ...summary.doses.map((d): HistoryRow => ({
      id: d.id,
      kind: 'vaccine',
      name: d.vaccine,
      on: d.appliedOn,
      detail: [d.lot && `lote ${d.lot}`, d.maker, d.vet, v.by(d.byName)].filter(Boolean).join(' · '),
    })),
    ...summary.care.map((c): HistoryRow => ({
      id: c.id,
      kind: 'care',
      name: c.item,
      on: c.doneOn,
      detail: [c.note, strings.care.by(c.byName)].filter(Boolean).join(' · '),
    })),
  ].sort((a, b) => b.on.localeCompare(a.on));
  if (rows.length === 0) return null;

  async function remove(row: HistoryRow) {
    if (!(await confirm(row.kind === 'vaccine' ? v.removeConfirm : strings.care.removeConfirm))) return;
    const result =
      row.kind === 'vaccine' ? await backend.command('vaccine.remove', { vaccinationId: row.id }) : await backend.command('care.remove', { careId: row.id });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <details className="fold meta" open={editing || undefined}>
      <summary>{strings.petPage.history}</summary>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <ul className="list">
        {rows.map((row) => (
          <li key={row.id} className="row">
            <span className="grow">
              {row.name} · {formatDate(row.on)} <span className="muted">{row.detail}</span>
            </span>
            {editing && (
              <button type="button" className="secondary danger" onClick={() => void remove(row)}>
                {strings.care.remove}
              </button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
