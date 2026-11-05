// Small pieces shared by the screens: icons, the row of faces, the Manual handle.
import { useEffect, useRef, type ReactNode } from 'react';
import type { MeView } from '../application/api-contract';
import { initialOf } from '../domain/navigation';
import { strings } from '../domain/strings';
import type { Chefe } from './chefia';
import { focusableIn, nextFocusIndex } from './focus-trap';
import { Link } from './router';

function Icon({ path, ...rest }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path d={path} />
    </svg>
  );
}

export const SunIcon = () => (
  <Icon path="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
);
export const CameraIcon = () => <Icon path="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />;
export const WarningIcon = () => <Icon path="M12 4 3 20h18zM12 10v4M12 17h.01" />;
export const PhoneIcon = () => <Icon path="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />;
export const HeartbeatIcon = () => <Icon path="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM8 12h2l1-2 2 4 1-2h2" />;
export const CloseIcon = () => <Icon path="M6 6l12 12M18 6 6 18" />;

/** The main navigation: the Mural, then one round face per chefe. A sun dot marks what needs attention. */
export function Faces({ chefes, current, onDark = false }: { chefes: readonly Chefe[]; current: 'mural' | string; onDark?: boolean }) {
  return (
    <nav className={`faces${onDark ? ' on-dark' : ''}`} aria-label={strings.nav.main}>
      <Link to="/" className="face" aria-current={current === 'mural' ? 'page' : undefined}>
        <span className="dot sun">
          <SunIcon />
        </span>
        {strings.nav.mural}
      </Link>
      {chefes.map(({ pet, aura, status }) => (
        <Link key={pet.id} to={`/chefes/${pet.id}`} className={`face ${aura}`} aria-current={current === pet.id ? 'page' : undefined}>
          <span className="dot">{initialOf(pet.profile.name)}</span>
          {status.needsAttention && <span className="pend" role="img" aria-label={strings.nav.pending} />}
          <span className="name">{pet.profile.name}</span>
        </Link>
      ))}
    </nav>
  );
}

/** The member's own face, in the corner: leads to the settings. */
export function MeLink({ me }: { me: MeView }) {
  return (
    <Link to="/configuracoes" className="me" aria-label={strings.nav.settings}>
      <span>{initialOf(me.name)}</span>
    </Link>
  );
}

export function BackBar({ to, label = strings.nav.back }: { to: string; label?: string }) {
  return (
    <Link to={to} className="back" aria-label={label}>
      <Icon path="M15 5l-7 7 7 7" />
    </Link>
  );
}

/** Fixed on the bottom edge of every screen: the Cartão de Saúde is a gesture away. */
export function ManualHandle({ to }: { to: string }) {
  return (
    <Link to={to} className="handle">
      <Icon path="M6 15l6-6 6 6" className="chevron" />
      <span className="handle-row">
        <HeartbeatIcon />
        {strings.nav.manual}
      </span>
    </Link>
  );
}

/** The live region of the confirmations; always in the page so screen readers announce what appears in it. */
export function Toast({ message }: { message: string | null }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && <p className="toast">{message}</p>}
    </div>
  );
}

/**
 * A modal layer (drawer): focus moves into its dialog, Tab stays inside, the rest of the screen is inert
 * meanwhile, and focus returns to what opened it when the layer closes.
 */
export function Layer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Everything beside the layer (the page, the Manual handle) is out of reach; the toast keeps announcing.
    const inerted = Array.from(layer.parentElement?.children ?? []).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== layer && !el.classList.contains('toast-region') && !el.hasAttribute('inert'),
    );
    inerted.forEach((el) => el.setAttribute('inert', ''));

    const dialog = layer.querySelector<HTMLElement>('[role="dialog"]') ?? layer;
    dialog.tabIndex = -1;
    dialog.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusableIn(layer);
      const next = nextFocusIndex(items.length, items.indexOf(document.activeElement as HTMLElement), event.shiftKey);
      event.preventDefault();
      items[next]?.focus();
    };
    layer.addEventListener('keydown', onKey);

    return () => {
      layer.removeEventListener('keydown', onKey);
      inerted.forEach((el) => el.removeAttribute('inert'));
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <div className="layer" ref={ref}>
      {children}
    </div>
  );
}

/** Closes a layer (drawer) on Escape. */
export function useEscape(close: () => void): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
}
