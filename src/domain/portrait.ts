// The "Retrato" look's rules (docs/spec/navegacao.md, docs/spec/proximas-acoes.md): the colored ring
// around a pet's photo and the state line under the greeting.
// Pure: the caller passes the status and today's date.
import { type PetStatus } from './next-actions';

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
