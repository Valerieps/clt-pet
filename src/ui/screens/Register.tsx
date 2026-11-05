import { dueLabel } from '../../domain/navigation';
import { formatKilos, latestWeight } from '../../domain/pets/weight';
import { strings } from '../../domain/strings';
import { useChefia } from '../chefia';
import { CloseIcon, Layer, useEscape } from '../parts';
import { goBack, Link } from '../router';

const t = strings.register;

/** What can be registered for a chefe (docs/spec/navegacao.md). Each item leads to its form on the chefe's page. */
export function RegisterDrawer({ petId }: { petId: string }) {
  const { chefes } = useChefia();
  const chefe = chefes.find((c) => c.pet.id === petId);
  const close = () => goBack(`/chefes/${petId}`);
  useEscape(close);
  if (!chefe) return null;

  const { pet, status } = chefe;
  const latest = latestWeight(pet.weights);
  return (
    <Layer>
      <button type="button" className="scrim" aria-label={strings.nav.close} onClick={close} />
      <div className="drawer floating" role="dialog" aria-label={t.button}>
        <span className="grip" />
        <div className="spread">
          <h2>{t.title(pet.profile.name)}</h2>
          <button type="button" className="close" aria-label={strings.nav.close} onClick={close}>
            <CloseIcon />
          </button>
        </div>
        <div>
          <Link to={`/chefes/${pet.id}#vacinas`} replace className="item">
            <p>{t.vaccine}</p>
            <span className="meta">{status.vaccine ? `${status.vaccine.item} · ${dueLabel(status.vaccine.overdue, status.vaccine.days)}` : ''}</span>
          </Link>
          <Link to={`/chefes/${pet.id}#peso`} replace className="item">
            <p>{t.weight}</p>
            <span className="meta">{latest ? t.lastWeight(formatKilos(latest.grams)) : t.noWeight}</span>
          </Link>
          {t.soon.map((item) => (
            <div key={item.label} className="item" aria-disabled="true">
              <p>
                {item.label}
                <span className="phase">{item.phase}</span>
              </p>
              <span />
            </div>
          ))}
        </div>
      </div>
    </Layer>
  );
}
