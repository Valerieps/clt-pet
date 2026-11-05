// The Prazos tab (docs/spec/navegacao.md): vaccines, parasites and hygiene, everything that comes due,
// with one status model. The current state first; the history folded below.
import { useState } from 'react';
import { careDueDate, careStatus, currentCare, type CareCategory } from '../../domain/care/care';
import { formatDate } from '../../domain/pets/pet';
import { strings } from '../../domain/strings';
import { boosterDate, currentDoses, vaccineStatus } from '../../domain/vaccines/vaccine';
import { useServices } from '../backend-context';
import { todayLocal, type Chefe } from '../chefia';
import { useConfirm } from '../confirm';

const s = strings.chefe.sections;
const status = strings.care.status;

export function PrazosPanel({ chefe, editing }: { chefe: Chefe; editing: boolean }) {
  const today = todayLocal();
  return (
    <>
      <section id="vacinas" className="stack">
        <h3>{s.vaccines}</h3>
        {chefe.doses.length === 0 && <p className="muted">{strings.vaccines.empty}</p>}
        <ul className="list">
          {currentDoses(chefe.doses).map((d) => {
            const state = vaccineStatus(d, today);
            return (
              <li key={d.id} className="card">
                <strong>{d.vaccine}</strong> · <span data-status={state}>{status[state]}</span>
                <br />
                <span className="muted">
                  {strings.vaccines.applied(formatDate(d.appliedOn))} · {strings.vaccines.booster(formatDate(boosterDate(d)))}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      <CareSection id="antiparasitarios" chefe={chefe} category="parasite" />
      <CareSection id="higiene" chefe={chefe} category="hygiene" />
      <PrazosHistory chefe={chefe} editing={editing} />
    </>
  );
}

function CareSection({ id, chefe, category }: { id: string; chefe: Chefe; category: CareCategory }) {
  const today = todayLocal();
  const records = chefe.care.filter((c) => c.category === category);
  return (
    <section id={id} className="stack">
      <h3>{category === 'parasite' ? s.parasites : s.hygiene}</h3>
      {records.length === 0 && <p className="muted">{strings.care.empty[category]}</p>}
      <ul className="list">
        {currentCare(records).map((c) => {
          const state = careStatus(c, today);
          return (
            <li key={c.id} className="card">
              <strong>{c.item}</strong> · <span data-status={state}>{status[state]}</span>
              <br />
              <span className="muted">
                {strings.care.done(formatDate(c.doneOn))} · {strings.care.next(formatDate(careDueDate(c)))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface HistoryRow {
  readonly id: string;
  readonly kind: 'vaccine' | 'care';
  readonly name: string;
  readonly on: string;
  readonly detail: string;
}

/** Every vaccine dose and care record, newest first; the remove buttons show only while editing. */
function PrazosHistory({ chefe, editing }: { chefe: Chefe; editing: boolean }) {
  const confirm = useConfirm();
  const { backend } = useServices();
  const [error, setError] = useState<string | null>(null);
  const v = strings.vaccines;
  const rows: HistoryRow[] = [
    ...chefe.doses.map((d): HistoryRow => ({
      id: d.id,
      kind: 'vaccine',
      name: d.vaccine,
      on: d.appliedOn,
      detail: [d.lot && `lote ${d.lot}`, d.maker, d.vet, v.by(d.byName)].filter(Boolean).join(' · '),
    })),
    ...chefe.care.map((c): HistoryRow => ({ id: c.id, kind: 'care', name: c.item, on: c.doneOn, detail: [c.note, strings.care.by(c.byName)].filter(Boolean).join(' · ') })),
  ].sort((a, b) => b.on.localeCompare(a.on));
  if (rows.length === 0) return null;

  async function remove(row: HistoryRow) {
    if (!(await confirm(row.kind === 'vaccine' ? v.removeConfirm : strings.care.removeConfirm))) return;
    const result =
      row.kind === 'vaccine' ? await backend.command('vaccine.remove', { vaccinationId: row.id }) : await backend.command('care.remove', { careId: row.id });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <details className="fold" open={editing || undefined}>
      <summary>{strings.chefe.history}</summary>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <ul className="list">
        {rows.map((row) => (
          <li key={row.id} className="card row">
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
