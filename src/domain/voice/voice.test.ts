import { describe, expect, it } from 'vitest';
import { BASE_PHRASES, NEUTRAL_PHRASES, VOICE_EVENTS } from './phrases';
import { fillPhrase, pickTemplate, toneFor } from './voice';

describe('toneFor', () => {
  const base = { seriousMode: false, graveCondition: false };

  it('jokes in reminders, the home screen and achievements', () => {
    for (const context of ['reminder', 'home', 'achievement'] as const) {
      expect(toneFor({ ...base, context })).toBe('humor');
    }
  });

  it('is neutral in clinical and urgent places, above any other setting', () => {
    for (const context of ['sos', 'emergencyContact', 'clinical', 'report'] as const) {
      expect(toneFor({ ...base, context })).toBe('neutral');
    }
  });

  it('turns the humor off in serious mode, and softens it with a grave condition', () => {
    expect(toneFor({ context: 'home', seriousMode: true, graveCondition: false })).toBe('neutral');
    expect(toneFor({ context: 'home', seriousMode: true, graveCondition: true })).toBe('neutral');
    expect(toneFor({ context: 'reminder', seriousMode: false, graveCondition: true })).toBe('gentle');
  });
});

describe('base library', () => {
  it('has a phrase for every pet and every event', () => {
    for (const set of Object.values(BASE_PHRASES)) {
      for (const event of VOICE_EVENTS) expect(set[event].length).toBeGreaterThan(0);
    }
  });

  it('uses only the known variables', () => {
    const all = [...Object.values(BASE_PHRASES), NEUTRAL_PHRASES].flatMap((set) => VOICE_EVENTS.flatMap((e) => set[e]));
    for (const phrase of all) {
      for (const [, name] of phrase.matchAll(/\{(\w+)\}/g)) {
        expect(['nome', 'item', 'dias', 'funcionario']).toContain(name);
      }
    }
  });

  it('leaves {funcionario} out of the reminder events, which do not fill it', () => {
    const sets = [...Object.values(BASE_PHRASES), NEUTRAL_PHRASES];
    const mural = sets.flatMap((set) => [...set.dueSoon, ...set.overdue, ...set.allGood]);
    for (const phrase of mural) expect(phrase).not.toContain('{funcionario}');
  });

  it('gives every pet more than one phrase for the reminder events', () => {
    for (const set of Object.values(BASE_PHRASES)) {
      for (const event of ['dueSoon', 'overdue', 'allGood'] as const) expect(set[event].length).toBeGreaterThan(1);
    }
  });
});

describe('fillPhrase', () => {
  it('fills the variables and leaves missing ones as written', () => {
    expect(fillPhrase('{item} vence em {dias} dias, {funcionario}.', { nome: 'Panda', item: 'V10', dias: 7 })).toBe(
      'V10 vence em 7 dias, {funcionario}.',
    );
  });
});

describe('pickTemplate', () => {
  it('draws from the pet, and from the neutral set when serious', () => {
    const humor = pickTemplate({ petId: 'pet-panda', event: 'allGood', tone: 'humor', random: () => 0 });
    expect(humor).toBe(BASE_PHRASES['pet-panda'].allGood[0]);
    const serious = pickTemplate({ petId: 'pet-panda', event: 'allGood', tone: 'neutral', random: () => 0 });
    expect(serious).toBe(NEUTRAL_PHRASES.allGood[0]);
  });

  it('falls back to the neutral phrase for a pet with no phrases', () => {
    expect(pickTemplate({ petId: 'novo', event: 'overdue', tone: 'humor', random: () => 0.9 })).toBe(NEUTRAL_PHRASES.overdue[0]);
  });

  it('does not repeat the last phrase when there is another', () => {
    const phrases = ['a', 'b'];
    const original = BASE_PHRASES['pet-panda'].dueSoon;
    (BASE_PHRASES['pet-panda'] as { dueSoon: readonly string[] }).dueSoon = phrases;
    try {
      for (const r of [0, 0.4, 0.5, 0.99]) {
        expect(pickTemplate({ petId: 'pet-panda', event: 'dueSoon', tone: 'humor', last: 'a', random: () => r })).toBe('b');
      }
    } finally {
      (BASE_PHRASES['pet-panda'] as { dueSoon: readonly string[] }).dueSoon = original;
    }
  });
});
