import { describe, expect, it } from 'vitest';
import { addDays, boosterDate, currentDoses, normalizeDose, vaccineStatus } from './vaccine';

const dose = (appliedOn: string, intervalDays = 365, vaccine = 'V4') => ({ vaccine, appliedOn, intervalDays });

describe('booster and status', () => {
  it('adds days across month and year edges', () => {
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
    expect(boosterDate(dose('2026-01-10', 365))).toBe('2027-01-10');
  });

  it('is ok, soon (up to 30 days) or overdue', () => {
    const today = '2026-11-04';
    expect(vaccineStatus(dose('2026-06-01'), today)).toBe('ok');
    expect(vaccineStatus(dose('2025-12-05'), today)).toBe('ok'); // due 2026-12-05, 31 days away
    expect(vaccineStatus(dose('2025-12-04'), today)).toBe('soon'); // due 2026-12-04, 30 days away
    expect(vaccineStatus(dose('2025-11-04'), today)).toBe('soon'); // due today is not late yet
    expect(vaccineStatus(dose('2025-11-03'), today)).toBe('overdue');
  });
});

describe('currentDoses', () => {
  it('keeps the latest dose of each vaccine, ignoring case', () => {
    const doses = [dose('2024-01-01'), dose('2025-01-01', 365, 'v4'), dose('2025-03-01', 365, 'FeLV')];
    expect(currentDoses(doses).map((d) => [d.vaccine, d.appliedOn])).toEqual([
      ['v4', '2025-01-01'],
      ['FeLV', '2025-03-01'],
    ]);
  });
});

describe('normalizeDose', () => {
  const today = '2026-11-04';
  it('needs only the vaccine and the date', () => {
    expect(normalizeDose({ vaccine: ' V4 ', appliedOn: '2026-11-01' }, today)).toEqual({
      vaccine: 'V4',
      appliedOn: '2026-11-01',
      intervalDays: 365,
      lot: null,
      maker: null,
      vet: null,
    });
  });

  it('refuses a missing vaccine, a bad or future date and a bad interval', () => {
    expect(normalizeDose({ vaccine: '', appliedOn: '2026-11-01' }, today)).toBeNull();
    expect(normalizeDose({ vaccine: 'V4', appliedOn: '2026-11-05' }, today)).toBeNull();
    expect(normalizeDose({ vaccine: 'V4', appliedOn: '2026-02-30' }, today)).toBeNull();
    expect(normalizeDose({ vaccine: 'V4', appliedOn: '2026-11-01', intervalDays: 0 }, today)).toBeNull();
    expect(normalizeDose({ vaccine: 'V4', appliedOn: '2026-11-01', lot: 5 }, today)).toBeNull();
  });
});
