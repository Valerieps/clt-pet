// What a pet demands on its page (docs/spec/navegacao.md, "Exige"): vaccines, medications, hygiene,
// routine consultas and the return of a consulta. Pure: the UI passes the records.
import { type CareCategory, type CareRecord } from './care/care';
import { careOccurrences, currentPrazos, doseOccurrences, visitOccurrences, type Plan } from './prazos';
import { addDays, type Dose, type VaccineStatus } from './vaccines/vaccine';

/** Days before a consulta's return that it turns "vence logo". */
export const RETURN_SOON_DAYS = 7;
export type DeadlineKind = 'vaccine' | 'parasite' | 'hygiene' | 'visit' | 'return';

export interface Deadline {
  readonly id: string;
  readonly kind: DeadlineKind;
  /** The vaccine, the care item or the consulta's subject. */
  readonly name: string;
  /** YYYY-MM-DD. */
  readonly due: string;
  readonly state: VaccineStatus;
}

export interface DeadlineVisit {
  readonly id: string;
  readonly kind: string;
  readonly onDate: string;
  readonly title: string;
  readonly returnOn: string | null;
}

export interface DeadlineSources {
  readonly doses: readonly (Dose & { readonly id: string })[];
  readonly care: readonly (CareRecord & { readonly id: string; readonly category: CareCategory })[];
  readonly visits: readonly DeadlineVisit[];
  /** The planned prazos (docs/spec/prazos.md); while one exists, it decides its item's date. */
  readonly plans?: readonly Plan[];
}

/** A return turns "soon" 7 days before its date and "overdue" the day after. */
export function returnStatus(returnOn: string, today: string): VaccineStatus {
  if (returnOn < today) return 'overdue';
  return returnOn <= addDays(today, RETURN_SOON_DAYS) ? 'soon' : 'ok';
}

/**
 * The returns still open: a return is kept by a consulta registered for the same pet from 7 days before
 * it on. Without that consulta it stays, overdue, until someone registers it or deletes the visit.
 */
export function openReturns<T extends DeadlineVisit>(visits: readonly T[]): T[] {
  return visits.filter(
    (v) =>
      v.returnOn !== null &&
      !visits.some((other) => other.id !== v.id && other.kind === 'consulta' && other.onDate >= addDays(v.returnOn!, -RETURN_SOON_DAYS)),
  );
}

/** "Exige": everything late or due soon, the soonest first. */
export function demandedDeadlines(sources: DeadlineSources, today: string): Deadline[] {
  const plans = sources.plans ?? [];
  const care = (category: CareCategory): Deadline[] =>
    currentPrazos(category, careOccurrences(sources.care.filter((c) => c.category === category)), plans, today).map((p) => ({
      id: p.id,
      kind: category,
      name: p.item,
      due: p.due,
      state: p.state,
    }));
  const all: Deadline[] = [
    ...currentPrazos('vaccine', doseOccurrences(sources.doses), plans, today).map((p): Deadline => ({
      id: p.id,
      kind: 'vaccine',
      name: p.item,
      due: p.due,
      state: p.state,
    })),
    ...care('parasite'),
    ...care('hygiene'),
    ...currentPrazos('visit', visitOccurrences(sources.visits, plans, today), plans, today).map((p): Deadline => ({
      id: p.id,
      kind: 'visit',
      name: p.item,
      due: p.due,
      state: p.state,
    })),
    ...openReturns(sources.visits).map((v): Deadline => ({
      id: v.id,
      kind: 'return',
      name: v.title,
      due: v.returnOn!,
      state: returnStatus(v.returnOn!, today),
    })),
  ];
  return all.filter((d) => d.state !== 'ok').sort((a, b) => a.due.localeCompare(b.due));
}
