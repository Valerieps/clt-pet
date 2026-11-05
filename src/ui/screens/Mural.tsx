import { useState } from 'react';
import type { MeView } from '../../application/api-contract';
import { dailyPhrase, doneToday, isSnoozed, messageKind, splitByTutor } from '../../domain/mural';
import { dueLabel } from '../../domain/navigation';
import { strings } from '../../domain/strings';
import { todayLocal, useChefia, type Chefe } from '../chefia';
import { CheckIcon, ChefeFace, Faces, MeLink } from '../parts';
import { Link } from '../router';

const t = strings.mural;

const localDay = (at: Date) => at.toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

/**
 * The home screen (docs/spec/mural.md): each chefe sends a message. The ones that need attention
 * come first, in color, with the button; the rest follow as they are, colored with the "Feito"
 * seal when something was registered today, white otherwise.
 */
export function Mural({ me }: { me: MeView }) {
  const { chefes, failed, loading } = useChefia();
  const today = todayLocal();
  // "Meus chefes" first; inside each group the original order (and so the auras) is kept.
  const mine = new Set(splitByTutor(chefes.map((c) => c.pet), me.id).mine.map((p) => p.id));
  const ordered = [...chefes.filter((c) => mine.has(c.pet.id)), ...chefes.filter((c) => !mine.has(c.pet.id))];
  const [snoozes, setSnoozes] = useState<Record<string, string>>(readSnoozes);
  const messages = ordered.map((chefe) => {
    const doneBy = doneToday(chefe.pet.lastRecord, today, localDay);
    const kind = messageKind(chefe.status.needsAttention, isSnoozed(snoozes[chefe.pet.id] ?? null, today), doneBy);
    return { chefe, doneBy, kind };
  });
  const sorted = [...messages.filter((m) => m.kind === 'attention'), ...messages.filter((m) => m.kind !== 'attention')];
  const snooze = (petId: string) => {
    const next = { ...snoozes, [petId]: today };
    setSnoozes(next);
    writeSnoozes(next);
  };

  return (
    <>
      <header className="mural-header">
        <h1 className="sr-only">{t.title}</h1>
        <Faces chefes={chefes} current="mural" />
        <MeLink me={me} />
      </header>
      <main className="mural-list">
        {failed && <p className="notice">{strings.genericError}</p>}
        {loading && <MuralSkeleton />}
        {chefes.length === 0 && !failed && !loading && (
          <>
            <p className="muted">{t.empty}</p>
            <div className="actions">
              <Link to="/chefes" className="btn">
                {t.addFirst}
              </Link>
            </div>
          </>
        )}
        {sorted.map(({ chefe, doneBy, kind }) =>
          kind === 'calm' ? (
            <CalmMessage key={chefe.pet.id} chefe={chefe} today={today} />
          ) : (
            <ColoredMessage key={chefe.pet.id} chefe={chefe} today={today} doneBy={doneBy} attention={kind === 'attention'} onSnooze={() => snooze(chefe.pet.id)} />
          ),
        )}
      </main>
    </>
  );
}

function phraseOf({ pet, status }: Chefe, today: string): string | null {
  return dailyPhrase({ id: pet.id, name: pet.profile.name, seriousMode: pet.seriousMode, allergiesAnswered: pet.allergiesAnswered }, status, today);
}

const SNOOZE_KEY = 'clt-pet:lembrar-amanha';

/** Snoozes live on this device only (docs/spec/mural.md); a blocked storage just means no snooze. */
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

/**
 * A message in the chefe's aura. While the chefe needs attention it carries the reason and the
 * button; once something was registered today it carries the "Feito" seal instead.
 */
function ColoredMessage({ chefe, today, doneBy, attention, onSnooze }: { chefe: Chefe; today: string; doneBy: string | null; attention: boolean; onSnooze: () => void }) {
  const { pet, aura, status } = chefe;
  const phrase = phraseOf(chefe, today);
  const pill = !attention
    ? null
    : status.vaccine
      ? `${status.vaccine.item} · ${dueLabel(status.vaccine.overdue, status.vaccine.days)}`
      : status.weightChange
        ? t.weightPill(status.weightChange.percent)
        : t.allergiesPill;
  return (
    <article className={`msg ${aura}${doneBy ? ' sealed' : ''}`}>
      <ChefeFace pet={pet} className="msg-face" />
      <div className="bubble sunbg">
        <Link to={`/chefes/${pet.id}`}>
          <span className="monument">{pet.profile.name}</span>
          {pill && <span className="when on-dark">{pill}</span>}
        </Link>
        {phrase && <p>{phrase}</p>}
        {attention && status.weightChange && !status.vaccine && <p>{t.weightWatch}</p>}
        {attention && status.allergiesMissing && <p>{t.allergiesMissing}</p>}
        {attention && (
          <div className="actions">
            {status.vaccine || status.weightChange ? (
              <Link to={`/chefes/${pet.id}/registrar`} className="btn light">
                {strings.register.button}
              </Link>
            ) : (
              <Link to={`/chefes/${pet.id}`} className="btn light">
                {t.fillAllergies}
              </Link>
            )}
            <button type="button" className="btn ghost" onClick={onSnooze}>
              {t.snooze}
            </button>
          </div>
        )}
        {doneBy && (
          <span className="seal" role="img" aria-label={t.doneLabel(doneBy)}>
            <CheckIcon />
            <span aria-hidden="true">{t.done(doneBy)}</span>
          </span>
        )}
      </div>
    </article>
  );
}

/** A chefe with nothing demanded and nothing registered today: a small white message. */
function CalmMessage({ chefe, today }: { chefe: Chefe; today: string }) {
  const { pet, aura } = chefe;
  return (
    <Link to={`/chefes/${pet.id}`} className={`msg calm ${aura}`}>
      <ChefeFace pet={pet} className="msg-face" />
      <span className="bubble">
        <b>{pet.profile.name}</b>
        <span>{phraseOf(chefe, today) ?? t.allGood}</span>
      </span>
    </Link>
  );
}

/** What shows while the chefes load: the messages' shape, so the screen is never blank. */
function MuralSkeleton() {
  return (
    <div role="status" aria-label={t.loading}>
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
