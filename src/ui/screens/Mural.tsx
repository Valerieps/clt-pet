import type { MeView } from '../../application/api-contract';
import { dailyPhrase, splitByTutor } from '../../domain/mural';
import { dateLabel, dueLabel, initialOf } from '../../domain/navigation';
import { strings } from '../../domain/strings';
import { todayLocal, useChefia, type Chefe } from '../chefia';
import { Faces, MeLink } from '../parts';
import { Link } from '../router';

const t = strings.mural;

/** The home screen (docs/spec/mural.md): the chefes that need attention as cards, the rest as a calm line. */
export function Mural({ me }: { me: MeView }) {
  const { chefes, failed, loading } = useChefia();
  const today = todayLocal();
  // "Meus chefes" first; inside each group the original order (and so the auras) is kept.
  const mine = new Set(splitByTutor(chefes.map((c) => c.pet), me.id).mine.map((p) => p.id));
  const ordered = [...chefes.filter((c) => mine.has(c.pet.id)), ...chefes.filter((c) => !mine.has(c.pet.id))];
  const attention = ordered.filter((c) => c.status.needsAttention);
  const calm = ordered.filter((c) => !c.status.needsAttention);

  return (
    <>
      <header className="mural-header">
        <div className="spread">
          <div>
            <p className="lbl">{dateLabel(new Date())}</p>
            <h1 className="monument" style={{ fontSize: 40, marginTop: 4 }}>
              {t.title}
            </h1>
          </div>
          <MeLink me={me} />
        </div>
        <Faces chefes={chefes} current="mural" />
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
        {attention.map((chefe) => (
          <AttentionCard key={chefe.pet.id} chefe={chefe} today={today} />
        ))}
        {calm.map((chefe) => (
          <CalmLine key={chefe.pet.id} chefe={chefe} today={today} />
        ))}
      </main>
    </>
  );
}

function phraseOf({ pet, status }: Chefe, today: string): string | null {
  return dailyPhrase({ id: pet.id, name: pet.profile.name, seriousMode: pet.seriousMode, allergiesAnswered: pet.allergiesAnswered }, status, today);
}

function AttentionCard({ chefe, today }: { chefe: Chefe; today: string }) {
  const { pet, aura, status } = chefe;
  const name = pet.profile.name;
  const phrase = phraseOf(chefe, today);
  const pill = status.vaccine
    ? `${status.vaccine.item} · ${dueLabel(status.vaccine.overdue, status.vaccine.days)}`
    : status.weightChange
      ? t.weightPill(status.weightChange.percent)
      : t.allergiesPill;
  return (
    <article className={`mural-card sunbg ${aura}`}>
      <Link to={`/chefes/${pet.id}`}>
        <span className="monument">{name}</span>
        <span className="when on-dark">{pill}</span>
      </Link>
      {phrase && <p>{phrase}</p>}
      {status.weightChange && !status.vaccine && <p>{t.weightWatch}</p>}
      {status.allergiesMissing && <p>{t.allergiesMissing}</p>}
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
      </div>
    </article>
  );
}

function CalmLine({ chefe, today }: { chefe: Chefe; today: string }) {
  const { pet, aura } = chefe;
  return (
    <Link to={`/chefes/${pet.id}`} className={`mural-calm ${aura}`}>
      <span className="dot">{initialOf(pet.profile.name)}</span>
      <span>{phraseOf(chefe, today) ?? t.allGood}</span>
    </Link>
  );
}

/** What shows while the chefes load: the cards' shape, so the screen is never blank. */
function MuralSkeleton() {
  return (
    <div role="status" aria-label={t.loading}>
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
