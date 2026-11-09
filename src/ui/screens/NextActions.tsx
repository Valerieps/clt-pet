import { useState } from 'react';
import type { MeView } from '../../application/api-contract';
import { doneToday, isSnoozed, upcomingCare, type CareLine } from '../../domain/next-actions';
import { dueLabel } from '../../domain/due-text';
import { greetingFor } from '../../domain/greeting';
import { careRing, homeState, type CareRing } from '../../domain/portrait';
import { strings } from '../../domain/strings';
import { todayLocal, usePets, type PetSummary } from '../use-pets';
import { PetFace, MeLink } from '../parts';
import { Link } from '../router';

const t = strings.home;

const localDay = (at: Date) => at.toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

const isFemale = (summary: PetSummary) => summary.pet.profile.sex === 'female';

/**
 * The home screen (docs/spec/proximas-acoes.md): the greeting and a line of state, each pet in a big round
 * photo with the ring of its state, then "Hoje" and "Próximos cuidados" as a timeline.
 */
export function NextActions({ me }: { me: MeView }) {
  const { summaries, failed, loading } = usePets();
  const today = todayLocal();
  const [snoozes, setSnoozes] = useState<Record<string, string>>(readSnoozes);
  const byId = new Map(summaries.map((c) => [c.pet.id, c]));
  const snoozed = new Set(summaries.filter((c) => isSnoozed(snoozes[c.pet.id] ?? null, today)).map((c) => c.pet.id));
  const lines = upcomingCare(
    summaries.map((c) => ({ petId: c.pet.id, status: c.status })),
    snoozed,
  );
  const done = summaries.flatMap((summary) => {
    const record = doneToday(summary.pet.lastRecord, today, localDay);
    return record ? [{ summary, record }] : [];
  });
  const rings = summaries.map((c) => careRing(c.status));
  const state = homeState(rings);
  const snooze = (petId: string) => {
    const next = { ...snoozes, [petId]: today };
    setSnoozes(next);
    writeSnoozes(next);
  };

  return (
    <>
      <header className="top-row">
        <span />
        <MeLink me={me} />
      </header>
      <main className="home">
        <div className="greeting">
          <h1>{t.greeting(greetingFor(new Date()), me.name)}</h1>
          {summaries.length > 0 && <p className="support">{state.late + state.soon === 0 ? t.calm : t.stateLine(state.late, state.soon)}</p>}
        </div>
        {failed && <p className="notice">{strings.genericError}</p>}
        {loading && <HomeSkeleton />}
        {summaries.length === 0 && !failed && !loading && (
          <p className="support">
            {t.empty}{' '}
            <Link to="/pets" className="text-link">
              {t.addFirst}
            </Link>
          </p>
        )}
        {summaries.length > 0 && (
          <>
            <section aria-label={t.petsTitle}>
              <ul className="portraits">
                {summaries.map((summary, i) => (
                  <li key={summary.pet.id}>
                    <Link to={`/pets/${summary.pet.id}`} className={`portrait ${summary.aura}`}>
                      <span className={`ring ${rings[i]}`}>
                        <PetFace pet={summary.pet} className="portrait-face" />
                      </span>
                      <b>{summary.pet.profile.name}</b>
                      <span className={`state ${rings[i]}`}>{t.ring[rings[i] as CareRing]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            {done.length > 0 && (
              <section aria-labelledby="home-done">
                <h2 id="home-done" className="lbl">
                  {t.doneTitle}
                </h2>
                <ol className="timeline">
                  {done.map(({ summary, record }) => (
                    <li key={summary.pet.id} className="ok">
                      <Link to={`/pets/${summary.pet.id}`} className="tl-what">
                        <b>{t.of(record.what, summary.pet.profile.name, isFemale(summary))}</b>
                        <span className="support">{t.by(record.by, record.at.getHours())}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <section aria-labelledby="home-next">
              <h2 id="home-next" className="lbl">
                {t.upcomingTitle}
              </h2>
              {lines.length === 0 ? (
                <p className="support">{t.nothingUpcoming}</p>
              ) : (
                <ol className="timeline">
                  {lines.map((line, i) => {
                    const summary = byId.get(line.petId);
                    return summary && <CareRow key={`${line.petId}-${i}`} summary={summary} line={line} onSnooze={() => snooze(line.petId)} />;
                  })}
                </ol>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

/** A point of "Próximos cuidados": what, of which pet, when and whose; a pending one can wait until tomorrow. */
function CareRow({ summary, line, onSnooze }: { summary: PetSummary; line: CareLine; onSnooze: () => void }) {
  const { pet } = summary;
  const name = pet.profile.name;
  const female = isFemale(summary);
  const what =
    line.kind === 'weight' ? t.of(t.weightWhat, name, female) : line.kind === 'allergies' ? t.of(t.allergiesWhat, name, female) : t.of(line.prazo.item, name, female);
  const when =
    line.kind === 'weight' ? t.weightPill(line.percent) : line.kind === 'allergies' ? t.allergiesPill : dueLabel(line.prazo.overdue, line.prazo.days);
  const tone = line.kind === 'next' ? 'next' : line.kind === 'prazo' && line.prazo.overdue ? 'late' : 'soon';
  const to = line.kind === 'allergies' ? `/pets/${pet.id}#perfil` : line.kind === 'next' ? `/pets/${pet.id}#agendamentos` : `/pets/${pet.id}/registrar`;
  return (
    <li className={tone}>
      <Link to={to} className="tl-what">
        <b>{what}</b>
        <span className="support">
          <span className={tone === 'next' ? undefined : `state ${tone}`}>{t.tutorOf(when, pet.tutorName)}</span>
        </span>
      </Link>
      {line.kind !== 'next' && (
        <button type="button" className="text-link small" onClick={onSnooze} aria-label={t.snoozeLabel(name)}>
          {t.snooze}
        </button>
      )}
    </li>
  );
}

const SNOOZE_KEY = 'clt-pet:lembrar-amanha';

/** Snoozes live on this device only (docs/spec/navegacao.md); a blocked storage just means no snooze. */
function readSnoozes(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SNOOZE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeSnoozes(value: Record<string, string>): void {
  try {
    window.localStorage.setItem(SNOOZE_KEY, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: the snooze lasts until the page reloads.
  }
}

/** What shows while the pets load: the circles' shape, so the screen is never blank. */
function HomeSkeleton() {
  return (
    <div className="portraits" role="status" aria-label={t.loading}>
      <span className="skeleton round" />
      <span className="skeleton round" />
      <span className="skeleton round" />
    </div>
  );
}
