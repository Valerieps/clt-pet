import { describe, expect, it } from 'vitest';
import { dailyPhrase, doneToday, messageKind, muralStatus, splitByTutor, type MuralPet } from './mural';
import { BASE_PHRASES } from './voice/phrases';

describe('doneToday', () => {
  const day = '2026-11-04';
  const utcDay = (at: Date) => at.toISOString().slice(0, 10);
  const brasilia = (at: Date) => new Date(at.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

  it('is null without a record or when the record is from another day', () => {
    expect(doneToday(null, day, utcDay)).toBeNull();
    expect(doneToday({ byName: 'Cesar', at: '2026-11-03T23:00:00Z' }, day, utcDay)).toBeNull();
  });

  it('gives the first name of who registered today', () => {
    expect(doneToday({ byName: 'Valéria Souza', at: '2026-11-04T09:00:00Z' }, day, utcDay)).toBe('Valéria');
    expect(doneToday({ byName: 'Cesar', at: '2026-11-04T09:00:00Z' }, day, utcDay)).toBe('Cesar');
  });

  it('judges the day on the device clock, not in UTC', () => {
    // 01:00 UTC on the 5th is still 22h of the 4th in Brasília.
    expect(doneToday({ byName: 'Cesar', at: '2026-11-05T01:00:00Z' }, day, brasilia)).toBe('Cesar');
    expect(doneToday({ byName: 'Cesar', at: '2026-11-05T01:00:00Z' }, day, utcDay)).toBeNull();
  });
});

describe('messageKind', () => {
  it('keeps the button while the chefe needs attention, even after a record today', () => {
    expect(messageKind(true, false, null)).toBe('attention');
    expect(messageKind(true, false, 'Cesar')).toBe('attention');
  });

  it('shows the seal without a button once something was registered and nothing is demanded', () => {
    expect(messageKind(false, false, 'Cesar')).toBe('done');
    expect(messageKind(true, true, 'Cesar')).toBe('done');
  });

  it('is a calm message otherwise', () => {
    expect(messageKind(false, false, null)).toBe('calm');
    expect(messageKind(true, true, null)).toBe('calm');
  });
});

const pet: MuralPet = { id: 'pet-panda', name: 'Panda', seriousMode: false, allergiesAnswered: true };
const today = '2026-11-04';

describe('muralStatus', () => {
  it('is fine with no doses and the allergies answered', () => {
    expect(muralStatus(pet, [], today)).toMatchObject({ needsAttention: false, vaccine: null });
  });

  it('needs attention when the allergies are blank', () => {
    const status = muralStatus({ ...pet, allergiesAnswered: false }, [], today);
    expect(status).toMatchObject({ needsAttention: true, allergiesMissing: true, vaccine: null });
  });

  it('needs attention with a vaccine due within 30 days, and names the days left', () => {
    const status = muralStatus(pet, [{ vaccine: 'V10', appliedOn: '2025-12-04', intervalDays: 365 }], today);
    expect(status).toMatchObject({ needsAttention: true, vaccine: { item: 'Vacina V10', overdue: false, days: 30 } });
  });

  it('picks the earliest booster date and counts the days late', () => {
    const status = muralStatus(
      pet,
      [
        { vaccine: 'V10', appliedOn: '2025-10-25', intervalDays: 365 },
        { vaccine: 'Antirrábica', appliedOn: '2025-10-20', intervalDays: 365 },
      ],
      today,
    );
    expect(status.vaccine).toEqual({ item: 'Vacina Antirrábica', overdue: true, days: 15 });
  });

  it('ignores a vaccine that is far from its booster', () => {
    expect(muralStatus(pet, [{ vaccine: 'V10', appliedOn: '2026-10-01', intervalDays: 365 }], today).needsAttention).toBe(false);
  });
});

describe('muralStatus: weight alert', () => {
  it('needs attention when the weight alert fired, even with everything else in order', () => {
    const status = muralStatus(pet, [], today, -12.5);
    expect(status).toMatchObject({ needsAttention: true, weightChange: { percent: -12.5 }, vaccine: null });
  });

  it('has no weight change without an alert', () => {
    expect(muralStatus(pet, [], today).weightChange).toBeNull();
  });

  it('has no phrase when only the weight alert fired', () => {
    expect(dailyPhrase(pet, muralStatus(pet, [], today, 8), today)).toBeNull();
  });
});

describe('dailyPhrase', () => {
  it('is the same all day and uses the chefe voice', () => {
    const status = muralStatus(pet, [], today);
    expect(dailyPhrase(pet, status, today)).toBe(dailyPhrase(pet, status, today));
    expect(BASE_PHRASES['pet-panda'].allGood).toContain(dailyPhrase(pet, status, today));
  });

  it('uses the neutral wording in serious mode', () => {
    const status = muralStatus(pet, [], today);
    expect(dailyPhrase({ ...pet, seriousMode: true }, status, today)).toBe('Estou com tudo em dia.');
  });

  it('fills the item and the days for a late vaccine', () => {
    const status = muralStatus(pet, [{ vaccine: 'V10', appliedOn: '2025-10-25', intervalDays: 365 }], today);
    expect(dailyPhrase(pet, status, today)).toMatch(/Vacina V10.*10 dias/);
  });

  it('has no phrase when only the allergies are missing', () => {
    const missing = { ...pet, allergiesAnswered: false };
    expect(dailyPhrase(missing, muralStatus(missing, [], today), today)).toBeNull();
  });
});

describe('splitByTutor', () => {
  it("puts the member's chefes first and keeps the order", () => {
    const pets = [
      { id: 'a', tutorMemberId: 'x' },
      { id: 'b', tutorMemberId: 'me' },
      { id: 'c', tutorMemberId: null },
      { id: 'd', tutorMemberId: 'me' },
    ];
    const { mine, others } = splitByTutor(pets, 'me');
    expect(mine.map((p) => p.id)).toEqual(['b', 'd']);
    expect(others.map((p) => p.id)).toEqual(['a', 'c']);
  });
});
