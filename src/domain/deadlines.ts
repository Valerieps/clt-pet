// What has a deadline on a pet's page (docs/spec/navegacao.md, "Exige" and "A seguir"): vaccines,
// parasites, hygiene, the return of a consulta and the end of a treatment. Pure: the UI passes the records.
import { type CareCategory, type CareRecord } from './care/care';
import { careOccurrences, currentPrazos, doseOccurrences, type Plan } from './prazos';
import { addDays, type Dose, type VaccineStatus } from './vaccines/vaccine';

/** Days before a consulta's return that it turns "vence logo". */
export const RETURN_SOON_DAYS = 7;
/** Days before a treatment's last day that it shows in "A seguir". */
export const TREATMENT_END_SOON_DAYS = 7;

export type DeadlineKind = 'vaccine' | 'parasite' | 'hygiene' | 'return' | 'treatmentEnd';

export interface Deadline {
  readonly id: string;
  readonly kind: DeadlineKind;
  /** The vaccine, the care item, the consulta's subject or the medicine. */
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

export interface DeadlineTreatment {
  readonly id: string;
  readonly name: string;
  readonly startOn: string;
  readonly endOn: string | null;
}

export interface DeadlineSources {
  readonly doses: readonly (Dose & { readonly id: string })[];
  readonly care: readonly (CareRecord & { readonly id: string; readonly category: CareCategory })[];
  readonly visits: readonly DeadlineVisit[];
  readonly treatments: readonly DeadlineTreatment[];
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

/** A treatment with an end date shows from 7 days before its last day until that day. Continuous use never shows. */
export const treatmentEndShows = (treatment: DeadlineTreatment, today: string): boolean =>
  treatment.endOn !== null && treatment.startOn <= today && today <= treatment.endOn && treatment.endOn <= addDays(today, TREATMENT_END_SOON_DAYS);

/**
 * "Exige": everything late or due soon, the soonest first; a treatment's end never demands.
 * "A seguir": the next `nextCount` deadlines that are fine, the soonest first.
 */
export function pageDeadlines(sources: DeadlineSources, today: string, nextCount = 2): { demanded: Deadline[]; next: Deadline[] } {
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
    ...currentPrazos('vaccine', doseOccurrences(sources.doses), plans, today).map((p): Deadline => ({ id: p.id, kind: 'vaccine', name: p.item, due: p.due, state: p.state })),
    ...care('parasite'),
    ...care('hygiene'),
    ...openReturns(sources.visits).map((v): Deadline => ({ id: v.id, kind: 'return', name: v.title, due: v.returnOn!, state: returnStatus(v.returnOn!, today) })),
    ...sources.treatments
      .filter((m) => treatmentEndShows(m, today))
      .map((m): Deadline => ({ id: m.id, kind: 'treatmentEnd', name: m.name, due: m.endOn!, state: 'ok' })),
  ];
  const byDue = (a: Deadline, b: Deadline) => a.due.localeCompare(b.due);
  return {
    demanded: all.filter((d) => d.state !== 'ok').sort(byDue),
    next: all.filter((d) => d.state === 'ok').sort(byDue).slice(0, nextCount),
  };
}
