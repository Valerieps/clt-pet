import { strings } from '../../domain/strings';
import { latestWeight, formatKilos } from '../../domain/pets/weight';
import { PetPhoto } from '../PetPhoto';
import { Link } from '../router';
import { useQuery } from '../use-query';

export function Pets() {
  const pets = useQuery('pets', {}, ['pets']);
  return (
    <section>
      <h1>{strings.pets.title}</h1>
      {pets.error && !pets.data && <p className="notice">{strings.genericError}</p>}
      {pets.data?.length === 0 && <p className="muted">{strings.pets.empty}</p>}
      <ul className="list">
        {pets.data?.map((pet) => {
          const latest = latestWeight(pet.weights);
          return (
            <li key={pet.id} className="card pet-header">
              <PetPhoto pet={pet} small />
              <div>
                <Link to={`/chefes/${pet.id}`}>
                  <strong>{pet.profile.name}</strong>
                </Link>{' '}
                <span className="muted">{strings.pets.species[pet.species]}</span>
                <br />
                <span className="muted">
                  {pet.tutorName ? strings.pets.tutor(pet.tutorName) : strings.pets.tutorPending(pet.tutorEmail)}
                  {' · '}
                  {latest ? strings.pets.currentWeight(formatKilos(latest.grams)) : strings.pets.noWeight}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
