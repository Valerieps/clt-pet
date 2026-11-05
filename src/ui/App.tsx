import { useEffect, useRef, type ReactNode, type TouchEvent } from 'react';
import type { MeView } from '../application/api-contract';
import { canManageGroup } from '../domain/group/roles';
import { swipeTarget } from '../domain/navigation';
import { strings } from '../domain/strings';
import { useLiveStatus, useServices } from './backend-context';
import { useChefia } from './chefia';
import { BackBar, ManualHandle } from './parts';
import { SpeedDial } from './SpeedDial';
import { navigate, usePath } from './router';
import { Invites } from './screens/Invites';
import { Members } from './screens/Members';
import { Mural } from './screens/Mural';
import { PetScreen } from './screens/PetScreen';
import { Pets } from './screens/Pets';
import { RegisterDrawer } from './screens/Register';
import { Settings } from './screens/Settings';
import { SignIn } from './screens/SignIn';
import { Manual } from './screens/Sos';
import { ConfirmProvider } from './confirm';
import { ToastProvider } from './toast';
import { useQuery } from './use-query';

/** The app's screens; the home is the Mural da Chefia (docs/spec/mural.md, docs/spec/navegacao.md). */
export function App() {
  const { backend, live } = useServices();
  const me = useQuery('me', {}, ['me']);
  const signedIn = me.data !== undefined && me.error !== 'unauthenticated';

  useEffect(() => {
    if (!signedIn) return;
    live.start();
    return () => live.stop();
  }, [live, signedIn]);

  if (me.loading && !me.data) {
    return (
      <header className="mural-header">
        <p className="lbl">{strings.appName}</p>
        <h1 className="monument" style={{ fontSize: 40, marginTop: 4 }}>
          {strings.mural.title}
        </h1>
        <div className="skeleton" role="status" aria-label={strings.mural.loading} />
        <div className="skeleton" />
      </header>
    );
  }
  if (!me.data && me.error && me.error !== 'unauthenticated') {
    return (
      <main className="app">
        <p className="notice" role="alert">
          {strings.genericError}
        </p>
        <button type="button" onClick={me.reload}>
          {strings.retry}
        </button>
      </main>
    );
  }
  if (!signedIn) return <SignIn />;

  async function signOut() {
    await backend.signOut();
    navigate('/', { replace: true });
    me.reload();
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Shell me={me.data} onSignOut={() => void signOut()} />
      </ConfirmProvider>
    </ToastProvider>
  );
}

const REGISTER_PATH = /^\/chefes\/([^/]+)\/registrar$/;
const MANUAL_PATH = /^\/sos(?:\/([^/]+))?$/;
const PET_PATH = /^\/chefes\/([^/]+)$/;

/** The screen under the layers: a drawer (Registrar, Manual) sits over the page it was opened from. */
function Shell({ me, onSignOut }: { me: MeView; onSignOut: () => void }) {
  const path = usePath();
  const { chefes } = useChefia();
  const touch = useRef<{ x: number; y: number } | null>(null);

  const register = REGISTER_PATH.exec(path);
  const manual = MANUAL_PATH.exec(path);
  const petId = register?.[1] ?? PET_PATH.exec(path)?.[1] ?? manual?.[1] ?? null;
  const currentPetId = petId ? decodeURIComponent(petId) : null;

  // Swiping sideways walks the main screens: the Mural, then each chefe.
  const order = ['/', ...chefes.map((c) => `/chefes/${c.pet.id}`)];
  const here = currentPetId && !register && !manual ? `/chefes/${currentPetId}` : path;
  const onTouchStart = (event: TouchEvent) => {
    const target = event.target as HTMLElement;
    const point = event.touches[0];
    touch.current = !point || target.closest('input, select, textarea, [data-no-swipe]') ? null : { x: point.clientX, y: point.clientY };
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    const end = event.changedTouches[0];
    touch.current = null;
    if (!start || !end) return;
    const to = swipeTarget(order, here, end.clientX - start.x, end.clientY - start.y);
    if (to) navigate(to);
  };

  const manualPetId = currentPetId ?? chefes[0]?.pet.id ?? null;

  return (
    <div className="shell" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <OfflineNotice />
      <Screen me={me} onSignOut={onSignOut} />
      {register && <RegisterDrawer petId={decodeURIComponent(register[1]!)} />}
      {manual && <Manual petId={manual[1] ? decodeURIComponent(manual[1]) : null} />}
      {!manual && !register && manualPetId && <SpeedDial petId={manualPetId} />}
      {!manual && <ManualHandle to={manualPetId ? `/sos/${manualPetId}` : '/sos'} />}
    </div>
  );
}

function OfflineNotice() {
  const status = useLiveStatus();
  if (status !== 'offline') return null;
  return (
    <p className="notice" role="status" style={{ margin: 8 }}>
      {strings.offline}
    </p>
  );
}

/** A settings sub-page: a back arrow to the settings, then the screen on a white sheet. */
function SubPage({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="page-header">
        <BackBar to="/configuracoes" label={strings.settings.title} />
      </header>
      <main className="sheet">{children}</main>
    </>
  );
}

function Screen({ me, onSignOut }: { me: MeView; onSignOut: () => void }) {
  const path = usePath();
  if (path === '/configuracoes') return <Settings me={me} onSignOut={onSignOut} />;
  if (path === '/membros')
    return (
      <SubPage>
        <Members me={me} />
      </SubPage>
    );
  if (path === '/chefes')
    return (
      <SubPage>
        <Pets />
      </SubPage>
    );
  if (path === '/convites' && canManageGroup(me))
    return (
      <SubPage>
        <Invites />
      </SubPage>
    );

  const register = REGISTER_PATH.exec(path);
  const petId = register?.[1] ?? PET_PATH.exec(path)?.[1] ?? MANUAL_PATH.exec(path)?.[1];
  if (petId) return <PetScreen petId={decodeURIComponent(petId)} me={me} />;
  return <Mural me={me} />;
}
