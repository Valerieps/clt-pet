import { useState, type FormEvent } from 'react';
import type { MeView } from '../../application/api-contract';
import { NAME_MAX_LENGTH } from '../../domain/group/profile';
import { canManageGroup, isAdmin } from '../../domain/group/roles';
import { initialOf } from '../../domain/navigation';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { BackBar } from '../parts';
import { Link } from '../router';
import { PushToggle } from './PushToggle';

const t = strings.settings;

/** The avatar's destination: chefes, members and invites, reminders, the member's own name, sign-out. */
export function Settings({ me, onSignOut }: { me: MeView; onSignOut: () => void }) {
  return (
    <>
      <header className="page-header">
        <BackBar to="/" label={strings.nav.backToMural} />
        <div className="pet-header" style={{ gap: 12 }}>
          <span className="me" style={{ width: 'auto', height: 'auto' }}>
            <span style={{ width: 44, height: 44, fontSize: 16 }}>{initialOf(me.name)}</span>
          </span>
          <div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{me.name}</p>
            <p className="meta" style={{ margin: 0 }}>
              {isAdmin(me) ? t.admin : t.member}
            </p>
          </div>
        </div>
      </header>
      <main className="sheet stack" style={{ gap: 20 }}>
        <section>
          <p className="lbl">{t.chefes}</p>
          <Link to="/chefes" className="item">
            <p>{t.allChefes}</p>
            <span className="meta">{t.chefesHint}</span>
          </Link>
        </section>
        <section>
          <p className="lbl">{t.access}</p>
          <Link to="/membros" className="item">
            <p>{t.members}</p>
            <span />
          </Link>
          {canManageGroup(me) && (
            <Link to="/convites" className="item">
              <p>{t.invites}</p>
              <span />
            </Link>
          )}
          <PushToggle />
        </section>
        <section>
          <p className="lbl">{t.account}</p>
          <Account me={me} />
        </section>
        <div>
          <button type="button" className="secondary" onClick={onSignOut}>
            {strings.nav.signOut}
          </button>
        </div>
      </main>
    </>
  );
}

function Account({ me }: { me: MeView }) {
  const { backend } = useServices();
  const [name, setName] = useState(me.name);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('member.rename', { name });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <form className="row" onSubmit={submit} style={{ marginTop: 8 }}>
      <label className="grow">
        <span className="muted">{strings.mural.nameLabel}</span>
        <input required maxLength={NAME_MAX_LENGTH} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="submit">{strings.mural.save}</button>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
