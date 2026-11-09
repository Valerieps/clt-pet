import { describe, expect, it } from 'vitest';
import { careRing, homeState } from './portrait';
import { petStatus, upcomingCare } from './next-actions';

const today = '2026-11-08';
const answered = { allergiesAnswered: true };
const dose = (appliedOn: string, intervalDays = 365) => ({ vaccine: 'V10', appliedOn, intervalDays });

describe('careRing', () => {
  it('is grey with nothing planned', () => {
    expect(careRing(petStatus(answered, [], today))).toBe('none');
  });

  it('is green with a next prazo and nothing pending', () => {
    expect(careRing(petStatus(answered, [dose('2026-11-01')], today))).toBe('ok');
  });

  it('is amber when something is due soon, the allergies are blank or the weight alert fired', () => {
    expect(careRing(petStatus(answered, [dose('2025-11-20')], today))).toBe('soon');
    expect(careRing(petStatus({ allergiesAnswered: false }, [], today))).toBe('soon');
    expect(careRing(petStatus(answered, [], today, 8))).toBe('soon');
  });

  it('is red when something is overdue', () => {
    expect(careRing(petStatus(answered, [dose('2025-10-01')], today))).toBe('late');
  });
});

describe('homeState', () => {
  it('counts the late and the soon rings', () => {
    expect(homeState(['ok', 'none', 'ok'])).toEqual({ late: 0, soon: 0 });
    expect(homeState(['late', 'soon', 'soon', 'ok'])).toEqual({ late: 1, soon: 2 });
  });
});

describe('upcomingCare', () => {
  it('lists the pendências first, then the next prazo of each calm pet, the nearest first', () => {
    const late = petStatus(answered, [dose('2025-10-01')], today);
    const far = petStatus(answered, [dose('2026-11-01')], today);
    const near = petStatus(answered, [dose('2026-06-01')], today);
    const none = petStatus(answered, [], today);
    const lines = upcomingCare([
      { petId: 'far', status: far },
      { petId: 'late', status: late },
      { petId: 'near', status: near },
      { petId: 'none', status: none },
    ]);
    expect(lines.map((l) => [l.petId, l.kind])).toEqual([
      ['late', 'prazo'],
      ['near', 'next'],
      ['far', 'next'],
    ]);
  });

  it('leaves out the pendências of a snoozed pet', () => {
    const late = petStatus(answered, [dose('2025-10-01')], today);
    expect(upcomingCare([{ petId: 'late', status: late }], new Set(['late']))).toEqual([]);
  });
});
