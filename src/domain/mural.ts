// The Mural da Chefia (docs/spec/mural.md): each chefe's overall status and the phrase of the day.
// Pure: the caller passes today's date and the doses.
import { careDueDate, careStatus, currentCare, type CareRecord } from './care/care';
import { daysBetween } from './reminders/reminders';
import { boosterDate, currentDoses, vaccineStatus, type Dose } from './vaccines/vaccine';
import { fillPhrase, pickTemplate, toneFor } from './voice/voice';

export interface MuralPet {
  readonly id: string;
  readonly name: string;
  readonly seriousMode: boolean;
  readonly allergiesAnswered: boolean;
}

export interface MuralStatus {
  /** "Exige atenção" when a vaccine is late or due within 30 days, the allergies are blank or the weight alert fired. */
  readonly needsAttention: boolean;
  readonly allergiesMissing: boolean;
  /** The weight alert (docs/spec/pets/weight): the percent the newest weight moved, or null. */
  readonly weightChange: { readonly percent: number } | null;
  /** The most urgent vaccine or parasite care: the one whose due date is earliest. */
  readonly vaccine: { readonly item: string; readonly overdue: boolean; readonly days: number } | null;
}

/**
 * `parasites` are the parasite care records (docs/spec/cuidados.md): late or due soon, they demand
 * attention like a vaccine. Hygiene stays on the chefe's page only.
 */
export function muralStatus(
  pet: MuralPet,
  doses: readonly Dose[],
  today: string,
  weightAlertPercent: number | null = null,
  parasites: readonly CareRecord[] = [],
): MuralStatus {
  const pending = [
    ...currentDoses(doses).map((dose) => ({ item: `Vacina ${dose.vaccine}`, status: vaccineStatus(dose, today), due: boosterDate(dose) })),
    ...currentCare(parasites).map((record) => ({ item: record.item, status: careStatus(record, today), due: careDueDate(record) })),
  ].filter((p) => p.status !== 'ok');
  const first = pending.reduce<(typeof pending)[number] | null>((best, p) => (!best || p.due < best.due ? p : best), null);
  const worst = first && { item: first.item, overdue: first.status === 'overdue', due: first.due };
  const allergiesMissing = !pet.allergiesAnswered;
  return {
    needsAttention: worst !== null || allergiesMissing || weightAlertPercent !== null,
    allergiesMissing,
    weightChange: weightAlertPercent === null ? null : { percent: weightAlertPercent },
    vaccine: worst && { item: worst.item, overdue: worst.overdue, days: Math.abs(daysBetween(today, worst.due)) },
  };
}

/** A number in [0, 1) that depends only on the text, so the same day always draws the same phrase. */
function seeded(text: string): () => number {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return () => (hash >>> 0) / 2 ** 32;
}

const previousDay = (iso: string): string => new Date(Date.parse(`${iso}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/**
 * The phrase of the day: it changes once a day (the draw depends on the date) and avoids the one
 * drawn the day before. Null when the chefe only lacks the allergies or only has a weight alert, which have no phrase.
 */
export function dailyPhrase(pet: MuralPet, status: MuralStatus, today: string): string | null {
  const event = status.vaccine ? (status.vaccine.overdue ? 'overdue' : 'dueSoon') : status.allergiesMissing || status.weightChange ? null : 'allGood';
  if (!event) return null;
  const tone = toneFor({ context: 'home', seriousMode: pet.seriousMode, graveCondition: false });
  const draw = (date: string, last: string | null) =>
    pickTemplate({ petId: pet.id, event, tone, last, random: seeded(`${pet.id}|${event}|${date}`) });
  const yesterday = draw(previousDay(today), null);
  return fillPhrase(draw(today, yesterday), {
    nome: pet.name,
    item: status.vaccine?.item,
    dias: status.vaccine?.days,
  });
}

/** "Meus chefes" first (the ones whose tutor is the member), then the rest, each in the original order. */
export function splitByTutor<T extends { readonly tutorMemberId: string | null }>(pets: readonly T[], memberId: string): { mine: T[]; others: T[] } {
  return { mine: pets.filter((p) => p.tutorMemberId === memberId), others: pets.filter((p) => p.tutorMemberId !== memberId) };
}
