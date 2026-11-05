// The Mural da Chefia (docs/spec/mural.md): each chefe's overall status and the phrase of the day.
// Pure: the caller passes today's date and the doses.
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
  /** "Exige atenção" when a vaccine is late or due within 30 days, or the allergies are blank. */
  readonly needsAttention: boolean;
  readonly allergiesMissing: boolean;
  /** The most urgent vaccine: the one whose booster date is earliest. */
  readonly vaccine: { readonly item: string; readonly overdue: boolean; readonly days: number } | null;
}

export function muralStatus(pet: MuralPet, doses: readonly Dose[], today: string): MuralStatus {
  let worst: { item: string; overdue: boolean; due: string } | null = null;
  for (const dose of currentDoses(doses)) {
    const status = vaccineStatus(dose, today);
    if (status === 'ok') continue;
    const due = boosterDate(dose);
    if (!worst || due < worst.due) worst = { item: `Vacina ${dose.vaccine}`, overdue: status === 'overdue', due };
  }
  const allergiesMissing = !pet.allergiesAnswered;
  return {
    needsAttention: worst !== null || allergiesMissing,
    allergiesMissing,
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
 * drawn the day before. Null when the chefe only lacks the allergies, which has no phrase.
 */
export function dailyPhrase(pet: MuralPet, status: MuralStatus, today: string): string | null {
  const event = status.vaccine ? (status.vaccine.overdue ? 'overdue' : 'dueSoon') : status.allergiesMissing ? null : 'allGood';
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
