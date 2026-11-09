import { useEffect, useState } from 'react';
import { strings } from '../domain/strings';
import { PlusIcon, useEscape } from './parts';
import { REGISTER_OPTIONS } from './register-options';
import { Link, useHash, usePath } from './router';

/**
 * The one footer of every screen (docs/spec/navegacao.md): "♥ Cartão de Saúde" on the left and
 * "+ Registrar" on the right. Registrar opens the leque (speed dial) with the acontecimentos; on a pet's
 * page the pill wears the pet's ink (`aura`), elsewhere it is neutral. Nothing floats over the content.
 */
export function BottomBar({ manualTo, petId, aura }: { manualTo: string; petId: string | null; aura: string | null }) {
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
      <footer className={`bar${aura ? ` ${aura} tinted` : ''}`}>
        <Link to={manualTo} className="bar-manual">
          <span className="heart" aria-hidden="true">
            ♥
          </span>
          {strings.nav.manual}
        </Link>
        {petId && (
          <div className={`dial${open ? ' open' : ''}`}>
            {open && (
              <ul className="dial-actions">
                {REGISTER_OPTIONS.map((a) => (
                  <li key={a.step}>
                    <Link to={`/pets/${petId}/registrar#${a.hash}`} className="dial-action">
                      <span className="dial-label">{a.label}</span>
                      <span className="dial-icon">{a.icon}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="register" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <PlusIcon />
              {t.button}
            </button>
          </div>
        )}
      </footer>
    </>
  );
}
