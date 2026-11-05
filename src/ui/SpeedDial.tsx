import { useEffect, useState } from 'react';
import { strings } from '../domain/strings';
import { BowlIcon, PillIcon, PlusIcon, ScaleIcon, ShieldIcon, StethoscopeIcon, VaccineIcon, useEscape } from './parts';
import { Link, useHash, usePath } from './router';

/** The floating + on every screen: opens a speed dial with what can be registered for the chefe. */
export function SpeedDial({ petId }: { petId: string }) {
  const [open, setOpen] = useState(false);
  const path = usePath();
  const hash = useHash();
  const close = () => setOpen(false);
  useEffect(() => setOpen(false), [path, hash]);
  useEscape(close);

  const t = strings.register;
  const actions = [
    { to: `/chefes/${petId}/registrar#vacina`, label: t.vaccine, icon: <VaccineIcon /> },
    { to: `/chefes/${petId}/registrar#peso`, label: t.weight, icon: <ScaleIcon /> },
    { to: `/chefes/${petId}/registrar#cuidado`, label: t.care, icon: <ShieldIcon /> },
    { to: `/chefes/${petId}/registrar#diario`, label: t.diary, icon: <BowlIcon /> },
    { to: `/chefes/${petId}/registrar#consulta`, label: t.visit, icon: <StethoscopeIcon /> },
    { to: `/chefes/${petId}/registrar#medicacao`, label: t.medication, icon: <PillIcon /> },
  ];
  return (
    <>
      {open && <button type="button" className="dial-scrim" aria-label={strings.nav.close} onClick={close} />}
      <div className={`dial${open ? ' open' : ''}`}>
        {open && (
          <ul className="dial-actions">
            {actions.map((a) => (
              <li key={a.label}>
                <Link to={a.to} className="dial-action">
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
