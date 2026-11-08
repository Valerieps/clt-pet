// The Prazos tab (docs/spec/prazos.md): vaccines, parasites and hygiene, each item with its next due
// date. A prazo comes from the item's latest record (its date plus its interval) or from a plan; a
// plan can exist before anything was done and, while it exists, it decides the next date.
// Pure: the UI and the server pass the records and the plans.
import { CARE_CATEGORIES, soonWindow, type CareCategory, type CareRecord } from './care/care';
import { isIsoDate, TEXT_MAX } from './pets/pet';
import { addDays, isValidInterval, SOON_DAYS, type Dose, type VaccineStatus } from './vaccines/vaccine';

export type PrazoKind = 'vaccine' | CareCategory;
export const PRAZO_KINDS: readonly PrazoKind[] = ['vaccine', ...CARE_CATEGORIES];

/** A planned prazo: the next date of an item and how often it repeats, set before (or instead of) a record. */
export interface Plan {
  readonly id: string;
  readonly kind: PrazoKind;
  readonly item: string;
  /** YYYY-MM-DD; any date, past or future. */
  readonly dueOn: string;
  readonly intervalDays: number;
}

/** One record of an item, whatever the kind: a dose or a care record. */
export interface Occurrence {
  readonly id: string;
  readonly item: string;
  /** YYYY-MM-DD. */
  readonly on: string;
  readonly intervalDays: number;
}

export interface Prazo {
  /** The plan's id when the item is planned, otherwise the latest record's. */
  readonly id: string;
  readonly kind: PrazoKind;
  readonly item: string;
  /** YYYY-MM-DD. */
  readonly due: string;
  readonly intervalDays: number;
  readonly state: VaccineStatus;
  /** The date of the latest record; null when the item was only planned. */
  readonly lastOn: string | null;
  /** The plan behind the due date, if any. */
  readonly planId: string | null;
}

export const sameItem = (a: string, b: string): boolean => a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR');

/** Vaccines turn "soon" 30 days before; parasites and hygiene a quarter of the interval before (docs/spec/cuidados.md). */
export function prazoStatus(kind: PrazoKind, due: string, intervalDays: number, today: string): VaccineStatus {
  if (due < today) return 'overdue';
  const window = kind === 'vaccine' ? SOON_DAYS : soonWindow(intervalDays);
  return due <= addDays(today, window) ? 'soon' : 'ok';
}

export const doseOccurrences = (doses: readonly (Dose & { readonly id: string })[]): Occurrence[] =>
  doses.map((d) => ({ id: d.id, item: d.vaccine, on: d.appliedOn, intervalDays: d.intervalDays }));

export const careOccurrences = (records: readonly (CareRecord & { readonly id: string })[]): Occurrence[] =>
  records.map((c) => ({ id: c.id, item: c.item, on: c.doneOn, intervalDays: c.intervalDays }));

/** The latest occurrence of each item (ties: the last one given), in the order the items first appear. */
function latestByItem(occurrences: readonly Occurrence[]): Occurrence[] {
  const latest: Occurrence[] = [];
  for (const o of occurrences) {
    const index = latest.findIndex((l) => sameItem(l.item, o.item));
    if (index < 0) latest.push(o);
    else if (o.on >= latest[index].on) latest[index] = o;
  }
  return latest;
}

/**
 * The prazos of one kind: one per item. A plan decides the date when there is one; otherwise the latest
 * record does. Items with records come first, in the order they first appear, then the ones only planned.
 */
export function currentPrazos(kind: PrazoKind, occurrences: readonly Occurrence[], plans: readonly Plan[], today: string): Prazo[] {
  const mine = plans.filter((p) => p.kind === kind);
  const latest = latestByItem(occurrences);
  const build = (item: string, lastOn: string | null, plan: Plan | undefined, record: Occurrence | undefined): Prazo => {
    const due = plan ? plan.dueOn : addDays(record!.on, record!.intervalDays);
    const intervalDays = plan ? plan.intervalDays : record!.intervalDays;
    return { id: plan?.id ?? record!.id, kind, item, due, intervalDays, state: prazoStatus(kind, due, intervalDays, today), lastOn, planId: plan?.id ?? null };
  };
  return [
    ...latest.map((o) => build(o.item, o.on, mine.find((p) => sameItem(p.item, o.item)), o)),
    ...mine.filter((p) => !latest.some((o) => sameItem(o.item, p.item))).map((p) => build(p.item, null, p, undefined)),
  ];
}

export interface PlanInput {
  readonly kind: PrazoKind;
  readonly item: string;
  readonly dueOn: string;
  readonly intervalDays: number;
}

/** The kind, the item, the next date and the interval are all required; the date may be past or future. Null when invalid. */
export function normalizePlan(raw: Record<string, unknown>): PlanInput | null {
  if (!PRAZO_KINDS.includes(raw.kind as PrazoKind)) return null;
  if (typeof raw.item !== 'string') return null;
  const item = raw.item.trim();
  if (item === '' || item.length > TEXT_MAX) return null;
  if (typeof raw.dueOn !== 'string' || !isIsoDate(raw.dueOn)) return null;
  if (!isValidInterval(raw.intervalDays)) return null;
  return { kind: raw.kind as PrazoKind, item, dueOn: raw.dueOn, intervalDays: raw.intervalDays };
}
