import { useEffect, useState } from 'react';
import { strings } from '../domain/strings';
import { PlusIcon, useEscape } from './parts';
import { REGISTER_OPTIONS } from './register-options';
import { Link, useHash, usePath } from './router';

/** The floating + on every screen: opens a speed dial with the acontecimentos that can be registered for the chefe. */
export function SpeedDial({ petId }: { petId: string }) {
  const [open, setOpen] = useState(false);
  const path = usePath();
  const hash = useHash();
  const close = () => setOpen(false);
  useEffect(() => setOpen(false), [path, hash]);
  useEscape(close);

  const t = strings.register;
  return (
    <>
      {open && <button type="button" className="dial-scrim" aria-label={strings.nav.close} onClick={close} />}
      <div className={`dial${open ? ' open' : ''}`}>
        {open && (
          <ul className="dial-actions">
            {REGISTER_OPTIONS.map((a) => (
              <li key={a.step}>
                <Link to={`/chefes/${petId}/registrar#${a.hash}`} className="dial-action">
                  <span className="dial-label">{a.label}</span>
                  <span className="dial-icon">{a.icon}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="fab" aria-label={t.button} title={t.button} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <PlusIcon />
        </button>
      </div>
    </>
  );
}
