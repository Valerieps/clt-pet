// Which tone a message gets and which phrase is drawn (docs/spec/voz-dos-pets.md, "Tom" and
// "Tags e frases"). Pure: the caller passes the random source and the last phrase shown.
import { BASE_PHRASES, GENTLE_PHRASES, NEUTRAL_PHRASES, type PhraseSet, type VoiceEvent } from './phrases';

/** Where a message shows up. Only reminders, nags, the home screen and achievements may joke. */
export type VoiceContext = 'reminder' | 'home' | 'achievement' | 'sos' | 'emergencyContact' | 'clinical' | 'report';

const HUMOR_CONTEXTS: readonly VoiceContext[] = ['reminder', 'home', 'achievement'];

export type Tone = 'humor' | 'gentle' | 'neutral';

export interface ToneInput {
  readonly context: VoiceContext;
  /** The pet's per-pet switch that turns the humor off (e.g. during a hospital stay). */
  readonly seriousMode: boolean;
  /** An active serious or chronic condition. */
  readonly graveCondition: boolean;
}

/** Neutral wherever the information is clinical or urgent, whatever the tags say. */
export function toneFor({ context, seriousMode, graveCondition }: ToneInput): Tone {
  if (!HUMOR_CONTEXTS.includes(context)) return 'neutral';
  if (seriousMode) return 'neutral';
  if (graveCondition) return 'gentle';
  return 'humor';
}

export interface VoiceVars {
  readonly nome: string;
  readonly item?: string;
  readonly dias?: number;
  readonly funcionario?: string;
}

/** Replaces {nome}, {item}, {dias} and {funcionario}; an unknown or missing variable stays as written. */
export function fillPhrase(template: string, vars: VoiceVars): string {
  return template.replace(/\{(nome|item|dias|funcionario)\}/g, (whole, key: keyof VoiceVars) => {
    const value = vars[key];
    return value === undefined ? whole : String(value);
  });
}

function candidates(set: PhraseSet | undefined, event: VoiceEvent): readonly string[] {
  return set?.[event] ?? [];
}

export interface PickInput {
  readonly petId: string;
  readonly event: VoiceEvent;
  readonly tone: Tone;
  /** The template last shown for this pet and event, so it is not repeated back to back. */
  readonly last?: string | null;
  /** Returns a number in [0, 1), like Math.random. */
  readonly random: () => number;
}

/** The template drawn for the pet, or the neutral one when the tone is not humor or the pet has none. */
export function pickTemplate({ petId, event, tone, last = null, random }: PickInput): string {
  const pool =
    tone === 'neutral'
      ? NEUTRAL_PHRASES[event]
      : tone === 'gentle'
        ? GENTLE_PHRASES[event]
        : candidates(BASE_PHRASES[petId], event);
  const fallback = NEUTRAL_PHRASES[event];
  const options = pool.length > 0 ? pool : fallback;
  const fresh = options.filter((phrase) => phrase !== last);
  const from = fresh.length > 0 ? fresh : options;
  return from[Math.min(from.length - 1, Math.floor(random() * from.length))];
}
