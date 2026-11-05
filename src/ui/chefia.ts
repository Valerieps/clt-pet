import { useMemo } from 'react';
import type { PetView, VaccinationView } from '../application/api-contract';
import { muralStatus, type MuralStatus } from '../domain/mural';
import { auraClass } from '../domain/navigation';
import { useQuery } from './use-query';

export const todayLocal = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

export interface Chefe {
  readonly pet: PetView;
  /** CSS class that sets the chefe's aura (docs/spec/navegacao.md). */
  readonly aura: string;
  readonly status: MuralStatus;
  readonly doses: readonly VaccinationView[];
}

/** Every chefe with its aura and Mural status: what the faces, the Mural and the pages share. */
export function useChefia(): { chefes: readonly Chefe[]; loading: boolean; failed: boolean } {
  const pets = useQuery('pets', {}, ['pets']);
  const vaccinations = useQuery('vaccinations', {}, ['vaccinations', 'pets']);
  const chefes = useMemo(() => {
    const today = todayLocal();
    return (pets.data ?? []).map((pet, index): Chefe => {
      const doses = (vaccinations.data ?? []).filter((d) => d.petId === pet.id);
      const forMural = { id: pet.id, name: pet.profile.name, seriousMode: pet.seriousMode, allergiesAnswered: pet.allergiesAnswered };
      return { pet, aura: auraClass(index), status: muralStatus(forMural, doses, today), doses };
    });
  }, [pets.data, vaccinations.data]);
  return { chefes, loading: pets.loading && !pets.data, failed: Boolean(pets.error && !pets.data) };
}
