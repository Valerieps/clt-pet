import { useState } from 'react';
import type { MeView } from '../../application/api-contract';
import { doneToday, isSnoozed, lastRecordLabel, pendingActions, tutorGroups, type PendingAction } from '../../domain/next-actions';
import { dueLabel } from '../../domain/due-text';
import { formatKilos, latestWeight } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { todayLocal, usePets, type PetSummary } from '../use-pets';
import { CheckIcon, PetFace, Faces, MeLink } from '../parts';
import { Link } from '../router';

const t = strings.home;

const localDay = (at: Date) => at.toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

/**
 * The home screen (docs/spec/proximas-acoes.md): plain information, no phrases. The Pendências of
 * every pet, what was done today, and one card per tutor with each pet's numbers.
 */
export function NextActions({ me }: { me: MeView }) {
  const { summaries, failed, loading } = usePets();
  const today = todayLocal();
  const [snoozes, setSnoozes] = useState<Record<string, string>>(readSnoozes);
  const byId = new Map(summaries.map((c) => [c.pet.id, c]));
  const snoozed = new Set(summaries.filter((c) => isSnoozed(snoozes[c.pet.id] ?? null, today)).map((c) => c.pet.id));
  const actions = pendingActions(
    summaries.map((c) => ({ petId: c.pet.id, status: c.status })),
    snoozed,
  );
  const done = summaries.flatMap((summary) => {
    const by = doneToday(summary.pet.lastRecord, today, localDay);
    return by ? [{ summary, by }] : [];
  });
  const groups = tutorGroups(
    summaries.map((c) => ({ ...c, tutorMemberId: c.pet.tutorMemberId, tutorName: c.pet.tutorName })),
    me.id,
  );
  const snooze = (petId: string) => {
    const next = { ...snoozes, [petId]: today };
    setSnoozes(next);
    writeSnoozes(next);
  };

  return (
    <>
      <header className="home-header">
        <h1 className="sr-only">{t.title}</h1>
        <Faces summaries={summaries} current="home" />
        <MeLink me={me} />
      </header>
      <main className="home">
        {failed && <p className="notice">{strings.genericError}</p>}
        {loading && <HomeSkeleton />}
        {summaries.length === 0 && !failed && !loading && (
          <>
            <p className="muted">{t.empty}</p>
            <div className="actions">
              <Link to="/pets" className="btn">
                {t.addFirst}
              </Link>
            </div>
          </>
        )}
        {summaries.length > 0 && (
          <>
            <section aria-labelledby="home-pending">
              <h2 id="home-pending" className="lbl">
                {t.pendingTitle}
              </h2>
              {actions.length === 0 ? (
                <p className="home-empty">{t.nothingPending}</p>
              ) : (
                <ul className="list home-rows">
                  {actions.map((action, i) => {
                    const summary = byId.get(action.petId);
                    return summary && <PendingRow key={`${action.petId}-${i}`} summary={summary} action={action} onSnooze={() => snooze(action.petId)} />;
                  })}
                </ul>
              )}
            </section>
            {done.length > 0 && (
              <section aria-labelledby="home-done">
                <h2 id="home-done" className="lbl">
                  {t.doneTitle}
                </h2>
                <ul className="list home-rows">
                  {done.map(({ summary, by }) => (
                    <li key={summary.pet.id} className={`home-row ${summary.aura}`}>
                      <PetFace pet={summary.pet} className="home-face" />
                      <Link to={`/pets/${summary.pet.id}`} className="home-what">
                        <b>{summary.pet.profile.name}</b>
                        <span>{t.doneBy(by)}</span>
                      </Link>
                      <span className="home-check" aria-hidden="true">
                        <CheckIcon />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {groups.map((group) => (
              <section key={group.memberId ?? 'none'} className="home-card" aria-label={group.name ? t.tutorTitle(group.name) : t.noTutor}>
                <h2 className="lbl">{group.name ? t.tutorTitle(group.name) : t.noTutor}</h2>
                <ul className="list">
                  {group.pets.map((summary) => (
                    <li key={summary.pet.id}>
                      <PetLine summary={summary} today={today} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}

/** One line of the Pendências: the pet, what is due and when, and the button. */
function PendingRow({ summary, action, onSnooze }: { summary: PetSummary; action: PendingAction; onSnooze: () => void }) {
  const { pet, aura } = summary;
  const what = action.kind === 'prazo' ? action.prazo.item : action.kind === 'weight' ? t.weightPill(action.percent) : t.allergiesPill;
  const when = action.kind === 'prazo' ? dueLabel(action.prazo.overdue, action.prazo.days) : null;
  const late = action.kind === 'prazo' && action.prazo.overdue;
  return (
    <li className={`home-row ${aura}`}>
      <PetFace pet={pet} className="home-face" />
      <div className="home-what">
        <Link to={`/pets/${pet.id}`}>
          <b>{pet.profile.name}</b>
        </Link>
        <span>
          {what}
          {when && <span className={`when${late ? ' late' : ''}`}>{when}</span>}
        </span>
      </div>
      <div className="home-buttons">
        {action.kind === 'allergies' ? (
          <Link to={`/pets/${pet.id}`} className="btn small">
            {t.fillAllergies}
          </Link>
        ) : (
          <Link to={`/pets/${pet.id}/registrar`} className="btn small">
            {strings.register.button}
          </Link>
        )}
        <button type="button" className="btn small line" onClick={onSnooze} aria-label={t.snoozeLabel(pet.profile.name)}>
          {t.snooze}
        </button>
      </div>
    </li>
  );
}

/** A pet in the tutor's card: the newest weight, the next prazo and the last record. The whole line opens the page. */
function PetLine({ summary, today }: { summary: PetSummary; today: string }) {
  const { pet, aura, status } = summary;
  const weight = latestWeight(pet.weights);
  const next = status.next;
  const last = lastRecordLabel(pet.lastRecord, today, localDay);
  return (
    <Link to={`/pets/${pet.id}`} className={`home-pet ${aura}`}>
      <span className="home-face-wrap">
        <PetFace pet={pet} className="home-face" />
        {status.needsAttention && <span className="pend" role="img" aria-label={strings.nav.pending} />}
      </span>
      <span className="home-what">
        <b>{pet.profile.name}</b>
        <span>{weight ? formatKilos(weight.grams) : t.noWeight}</span>
        <span>{next ? `${next.item} · ${dueLabel(next.overdue, next.days)}` : t.noPrazo}</span>
        <span className="home-last">{last ?? t.noRecord}</span>
      </span>
    </Link>
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

/** What shows while the pets load: the lines' shape, so the screen is never blank. */
function HomeSkeleton() {
  return (
    <div role="status" aria-label={t.loading}>
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
