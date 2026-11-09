// The "Retrato" look's rules (docs/spec/navegacao.md, docs/spec/proximas-acoes.md): the colored ring
// around a pet's photo, the line under the pet's name and the state line under the greeting.
// Pure: the caller passes the status and today's date.
import { type PetStatus } from './next-actions';
import { ageParts } from './pets/pet';
import { firstName } from './people';

/**
 * The ring around a pet's photo: late (red) when something is overdue; soon (amber) when something
 * is due soon, the weight alert fired or the allergies are blank; ok (green) when there is a next prazo
 * and nothing pending; none (grey) when nothing is planned.
 */
export type CareRing = 'late' | 'soon' | 'ok' | 'none';

export function careRing(status: PetStatus): CareRing {
  if (status.pending.some((p) => p.overdue)) return 'late';
  if (status.needsAttention) return 'soon';
  return status.next ? 'ok' : 'none';
}

/** The state line under the greeting: what the rings of every pet add up to. */
export function homeState(rings: readonly CareRing[]): { readonly late: number; readonly soon: number } {
  return { late: rings.filter((r) => r === 'late').length, soon: rings.filter((r) => r === 'soon').length };
}

interface SubtitlePet {
  readonly species: 'cat' | 'dog';
  readonly profile: { readonly breed: string | null; readonly birthDate: string | null; readonly birthEstimated: boolean; readonly sex: 'female' | 'male' | null };
  readonly tutorName: string | null;
}

const SPECIES = { cat: { female: 'Gata', male: 'Gato' }, dog: { female: 'Cadela', male: 'Cachorro' } } as const;

/** "10 anos", "uns 10 anos" when estimated, "8 meses" under a year; null without a birth date. */
export function shortAge(birthDate: string | null, estimated: boolean, today: string): string | null {
  if (!birthDate) return null;
  const { years, months } = ageParts(birthDate, today);
  const text = years === 0 ? (months <= 1 ? 'menos de 1 mês' : `${months} meses`) : years === 1 ? '1 ano' : `${years} anos`;
  return estimated ? `uns ${text}` : text;
}

/** "Gata · SRD · uns 10 anos · com Valéria": the line under the pet's name; the unknown parts are left out. */
export function petSubtitle(pet: SubtitlePet, today: string): string {
  const species = SPECIES[pet.species][pet.profile.sex ?? 'male'];
  const age = shortAge(pet.profile.birthDate, pet.profile.birthEstimated, today);
  const tutor = pet.tutorName ? `com ${firstName(pet.tutorName)}` : null;
  return [species, pet.profile.breed, age, tutor].filter(Boolean).join(' · ');
}
