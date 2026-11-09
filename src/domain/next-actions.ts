// Próximas Ações, the home screen (docs/spec/proximas-acoes.md): each pet's status, the pending
// actions of every pet, the next care of each one and what was done today.
// Pure: the caller passes today's date and the records.
import { type CareRecord } from './care/care';
import { firstName } from './people';
import { careOccurrences, currentPrazos, doseOccurrences, type Plan } from './prazos';
import { daysBetween } from './reminders/reminders';
import { type Dose } from './vaccines/vaccine';

export interface StatusPet {
  readonly allergiesAnswered: boolean;
}

/** A vaccine or parasite prazo as the home screen shows it. */
export interface PrazoSummary {
  readonly item: string;
  readonly overdue: boolean;
  /** Days late when overdue, days left otherwise. */
  readonly days: number;
}

export interface PetStatus {
  /** "Exige atenção" when a vaccine or parasite is late or due soon, the allergies are blank or the weight alert fired. */
  readonly needsAttention: boolean;
  readonly allergiesMissing: boolean;
  /** The weight alert (docs/spec/pets.md): the percent the newest weight moved, or null. */
  readonly weightChange: { readonly percent: number } | null;
  /** The most urgent pending vaccine or parasite care: the one whose due date is earliest. */
  readonly vaccine: PrazoSummary | null;
  /** Every pending (late or due soon) vaccine and parasite prazo, earliest due date first. */
  readonly pending: readonly PrazoSummary[];
  /** The next vaccine or parasite prazo, pending or not; null when there is none. */
  readonly next: PrazoSummary | null;
}

/**
 * `parasites` are the parasite care records (docs/spec/cuidados.md): late or due soon, they demand
 * attention like a vaccine. Hygiene stays on the pet's page only. `plans` are the pet's planned
 * prazos (docs/spec/prazos.md): a planned vaccine or parasite counts even before its first record.
 */
export function petStatus(
  pet: StatusPet,
  doses: readonly Dose[],
  today: string,
  weightAlertPercent: number | null = null,
  parasites: readonly CareRecord[] = [],
  plans: readonly Plan[] = [],
): PetStatus {
  const withIds = <T>(list: readonly T[]) => list.map((x, i) => ({ ...x, id: String(i) }));
  const all = [
    ...currentPrazos('vaccine', doseOccurrences(withIds(doses)), plans, today).map((p) => ({ item: `Vacina ${p.item}`, state: p.state, due: p.due })),
    ...currentPrazos('parasite', careOccurrences(withIds(parasites)), plans, today).map((p) => ({ item: p.item, state: p.state, due: p.due })),
  ].sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  const summary = (p: (typeof all)[number]): PrazoSummary => ({ item: p.item, overdue: p.state === 'overdue', days: Math.abs(daysBetween(today, p.due)) });
  const pending = all.filter((p) => p.state !== 'ok').map(summary);
  const allergiesMissing = !pet.allergiesAnswered;
  return {
    needsAttention: pending.length > 0 || allergiesMissing || weightAlertPercent !== null,
    allergiesMissing,
    weightChange: weightAlertPercent === null ? null : { percent: weightAlertPercent },
    vaccine: pending[0] ?? null,
    pending,
    next: all[0] ? summary(all[0]) : null,
  };
}

/** One line of the Pendências. */
export type PendingAction =
  | { readonly petId: string; readonly kind: 'prazo'; readonly prazo: PrazoSummary }
  | { readonly petId: string; readonly kind: 'weight'; readonly percent: number }
  | { readonly petId: string; readonly kind: 'allergies' };

/** Late first (the latest first), then the weight alert and the blank allergies, then what is due (the nearest first). */
function rank(action: PendingAction): number {
  if (action.kind !== 'prazo') return 0;
  return action.prazo.overdue ? -1 - action.prazo.days : 1 + action.prazo.days;
}

/**
 * The Pendências (docs/spec/proximas-acoes.md): one line per thing to do, of every pet together.
 * Pets in `snoozed` ("Lembrar amanhã") are left out. Ties keep the pets' order.
 */
export function pendingActions(summaries: readonly { readonly petId: string; readonly status: PetStatus }[], snoozed: ReadonlySet<string> = new Set()): PendingAction[] {
  const actions = summaries
    .filter((c) => !snoozed.has(c.petId))
    .flatMap(({ petId, status }): PendingAction[] => [
      ...status.pending.map((prazo) => ({ petId, kind: 'prazo' as const, prazo })),
      ...(status.weightChange ? [{ petId, kind: 'weight' as const, percent: status.weightChange.percent }] : []),
      ...(status.allergiesMissing ? [{ petId, kind: 'allergies' as const }] : []),
    ]);
  return actions.map((a, i) => ({ a, i })).sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i).map(({ a }) => a);
}

/** A line of "Próximos cuidados": a pending action, or the next prazo of a pet that has nothing pending. */
export type CareLine = PendingAction | { readonly petId: string; readonly kind: 'next'; readonly prazo: PrazoSummary };

/**
 * "Próximos cuidados" (docs/spec/proximas-acoes.md): the Pendências first, in their order, then the next
 * prazo of each pet with nothing pending, the nearest first. A snoozed pet's pendências leave the list,
 * as in the Pendências.
 */
export function upcomingCare(summaries: readonly { readonly petId: string; readonly status: PetStatus }[], snoozed: ReadonlySet<string> = new Set()): CareLine[] {
  const calm = summaries.flatMap(({ petId, status }) =>
    status.pending.length === 0 && status.next ? [{ petId, kind: 'next' as const, prazo: status.next }] : [],
  );
  calm.sort((a, b) => a.prazo.days - b.prazo.days);
  return [...pendingActions(summaries, snoozed), ...calm];
}

/** "Lembrar amanhã": a pet snoozed on `snoozedOn` leaves the Pendências for the rest of that day only. */
export const isSnoozed = (snoozedOn: string | null, today: string): boolean => snoozedOn === today;

/**
 * Feito hoje (docs/spec/proximas-acoes.md): what was registered for the pet today and the first
 * name of whoever did it, or null. `at` is when it was saved (ISO); `localDay` turns it into the device's
 * YYYY-MM-DD, so "today" ends at the tutor's midnight.
 */
export function doneToday(
  last: { readonly byName: string; readonly what: string; readonly at: string } | null,
  today: string,
  localDay: (at: Date) => string,
): { readonly by: string; readonly what: string; readonly at: Date } | null {
  if (!last || localDay(new Date(last.at)) !== today) return null;
  return { by: firstName(last.byName), what: last.what, at: new Date(last.at) };
}
