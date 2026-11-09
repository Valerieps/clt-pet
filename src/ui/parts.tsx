// Small pieces shared by the screens: icons, the row of faces, the Manual handle.
import { useEffect, useRef, type ReactNode } from 'react';
import { petPhotoPath, type MeView, type PetView } from '../application/api-contract';
import { initialOf } from '../domain/navigation';
import { strings } from '../domain/strings';
import type { PetSummary } from './use-pets';
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
export const VaccineIcon = () => <Icon path="M18 2l4 4M17 7l3-3M19 9 8.7 19.3a1 1 0 0 1-.7.3H5v-3a1 1 0 0 1 .3-.7L15.5 5.5M9 11l4 4M5 19l-3 3M14 4l6 6" />;
export const PillIcon = () => <Icon path="M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7zM8.5 8.5l7 7" />;
export const PencilIcon = () => <Icon path="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />;
export const ChevronLeftIcon = () => <Icon path="M15 5l-7 7 7 7" />;
export const CheckIcon = () => <Icon path="M5 12l5 5 9-10" />;
export const PlusIcon = () => <Icon path="M12 5v14M5 12h14" />;
export const ScaleIcon = () => <Icon path="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM6.5 13a5.5 5.5 0 0 1 11 0zM12 13l2.5-3.5" />;
/** Medicação dada: a shield. */
export const ShieldIcon = () => <Icon path="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM9 12l2 2 4-4" />;
/** Health: a stethoscope. */
export const StethoscopeIcon = () => <Icon path="M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2M20 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />;
/** Alimentação only: a bowl. */
export const BowlIcon = () => <Icon path="M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3" />;
/** The Prazos tab: a calendar with a check. */
export const CalendarIcon = () => <Icon path="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4" />;
/** Higiene feita: a drop of water. */
export const DropIcon = () => <Icon path="M12 3s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11zM9.5 15a2.5 2.5 0 0 0 2.5 2.5" />;
/** Algo estranho hoje: a note with a question mark. */
export const NoteIcon = () => <Icon path="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M10 11.5a2 2 0 1 1 2.5 1.9c-.3.1-.5.4-.5.7v.4M12 17h.01" />;
export const CatIcon =() => <Icon path="M5 20V6l4 3h6l4-3v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM9.5 13h.01M14.5 13h.01M11 16l1 1 1-1" />;
export const DogIcon = () => (
  <Icon path="M8 6C6 5 3.5 6 3.5 10c0 2 .5 4 2.5 4.5M16 6c2-1 4.5 0 4.5 4 0 2-.5 4-2.5 4.5M8 6c1-1 2.5-1.5 4-1.5S15 5 16 6v7c0 3.5-2 6-4 6s-4-2.5-4-6zM10 11h.01M14 11h.01M11 15h2l-1 1.2z" />
);

/** The main navigation: Próximas Ações, then one round face per pet. A sun dot marks what needs attention. */
export function Faces({ summaries, current, onDark = false }: { summaries: readonly PetSummary[]; current: 'home' | string; onDark?: boolean }) {
  return (
    <nav className={`faces${onDark ? ' on-dark' : ''}`} aria-label={strings.nav.main}>
      <Link to="/" className="face" aria-current={current === 'home' ? 'page' : undefined}>
        <span className="dot sun">
          <SunIcon />
        </span>
        {strings.nav.home}
      </Link>
      {summaries.map(({ pet, aura, status }) => (
        <Link key={pet.id} to={`/pets/${pet.id}`} className={`face ${aura}`} aria-current={current === pet.id ? 'page' : undefined}>
          <PetFace pet={pet} className="dot" />
          {status.needsAttention && <span className="pend" role="img" aria-label={strings.nav.pending} />}
          <span className="name">{pet.profile.name}</span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * A pet's round face: the photo, or the initial on the pet's aura while there is none.
 * Decorative: the pet's name always sits next to it.
 */
export function PetFace({ pet, className }: { pet: PetView; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      {pet.photoVersion ? <img src={petPhotoPath(pet.id, pet.photoVersion)} alt="" /> : initialOf(pet.profile.name)}
    </span>
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
