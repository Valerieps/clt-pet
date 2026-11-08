import { useMemo } from 'react';
import type { CareView, PetView, PlanView, VaccinationView } from '../application/api-contract';
import { muralStatus, type MuralStatus } from '../domain/mural';
import { auraClass } from '../domain/navigation';
import { weightAlert } from '../domain/pets/weight';
import { useQuery } from './use-query';

export const todayLocal = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

export interface Chefe {
  readonly pet: PetView;
  /** CSS class that sets the chefe's aura (docs/spec/navegacao.md). */
  readonly aura: string;
  readonly status: MuralStatus;
  readonly doses: readonly VaccinationView[];
  /** Parasite and hygiene records (docs/spec/cuidados.md). */
  readonly care: readonly CareView[];
  /** Planned prazos (docs/spec/prazos.md). */
  readonly plans: readonly PlanView[];
}

/** Every chefe with its aura and Mural status: what the faces, the Mural and the pages share. */
export function useChefia(): { chefes: readonly Chefe[]; loading: boolean; failed: boolean } {
  // Every record the Registrar saves moves `lastRecord`, the Mural's "Feito" seal.
  const pets = useQuery('pets', {}, ['pets', 'vaccinations', 'medications', 'care', 'visits', 'diary']);
  const vaccinations = useQuery('vaccinations', {}, ['vaccinations', 'pets']);
  const careRecords = useQuery('care', {}, ['care', 'pets']);
  const planned = useQuery('plans', {}, ['plans', 'pets']);
  const chefes = useMemo(() => {
    const today = todayLocal();
    return (pets.data ?? []).map((pet, index): Chefe => {
      const doses = (vaccinations.data ?? []).filter((d) => d.petId === pet.id);
      const care = (careRecords.data ?? []).filter((c) => c.petId === pet.id);
      const forMural = { id: pet.id, name: pet.profile.name, seriousMode: pet.seriousMode, allergiesAnswered: pet.allergiesAnswered };
      const alert = weightAlert(pet.weights, pet.weightAlertPercent);
      const parasites = care.filter((c) => c.category === 'parasite');
      const plans = (planned.data ?? []).filter((p) => p.petId === pet.id);
      return { pet, aura: auraClass(index), status: muralStatus(forMural, doses, today, alert?.percent ?? null, parasites, plans), doses, care, plans };
    });
  }, [pets.data, vaccinations.data, careRecords.data, planned.data]);
  return { chefes, loading: pets.loading && !pets.data, failed: Boolean(pets.error && !pets.data) };
}
