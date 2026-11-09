import { useMemo } from 'react';
import type { CareView, PetView, PlanView, VaccinationView } from '../application/api-contract';
import { petStatus, type PetStatus } from '../domain/next-actions';
import { auraClass } from '../domain/navigation';
import { weightAlert } from '../domain/pets/weight';
import { useQuery } from './use-query';

export const todayLocal = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in the device's time zone

export interface PetSummary {
  readonly pet: PetView;
  /** CSS class that sets the pet's aura (docs/spec/navegacao.md). */
  readonly aura: string;
  readonly status: PetStatus;
  readonly doses: readonly VaccinationView[];
  /** Parasite and hygiene records (docs/spec/cuidados.md). */
  readonly care: readonly CareView[];
  /** Planned prazos (docs/spec/prazos.md). */
  readonly plans: readonly PlanView[];
}

/** Every pet with its aura and status: what the faces, Próximas Ações and the pages share. */
export function usePets(): { summaries: readonly PetSummary[]; loading: boolean; failed: boolean } {
  // Every record the Registrar saves moves `lastRecord`, Feito hoje on Próximas Ações.
  const pets = useQuery('pets', {}, ['pets', 'vaccinations', 'medications', 'care', 'visits', 'diary']);
  const vaccinations = useQuery('vaccinations', {}, ['vaccinations', 'pets']);
  const careRecords = useQuery('care', {}, ['care', 'pets']);
  const planned = useQuery('plans', {}, ['plans', 'pets']);
  const summaries = useMemo(() => {
    const today = todayLocal();
    return (pets.data ?? []).map((pet, index): PetSummary => {
      const doses = (vaccinations.data ?? []).filter((d) => d.petId === pet.id);
      const care = (careRecords.data ?? []).filter((c) => c.petId === pet.id);
      const alert = weightAlert(pet.weights, pet.weightAlertPercent);
      const parasites = care.filter((c) => c.category === 'parasite');
      const plans = (planned.data ?? []).filter((p) => p.petId === pet.id);
      return { pet, aura: auraClass(index), status: petStatus(pet, doses, today, alert?.percent ?? null, parasites, plans), doses, care, plans };
    });
  }, [pets.data, vaccinations.data, careRecords.data, planned.data]);
  return { summaries, loading: pets.loading && !pets.data, failed: Boolean(pets.error && !pets.data) };
}
