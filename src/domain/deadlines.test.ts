import { describe, expect, it } from 'vitest';
import { openReturns, pageDeadlines, returnStatus, treatmentEndShows, type DeadlineSources } from './deadlines';

const today = '2026-11-05';
const empty: DeadlineSources = { doses: [], care: [], visits: [], treatments: [] };
const visit = (id: string, onDate: string, returnOn: string | null, kind = 'consulta') => ({ id, kind, onDate, title: `Visita ${id}`, returnOn });

describe('returnStatus', () => {
  it('is fine until 7 days before, soon from then on, overdue after the date', () => {
    expect(returnStatus('2026-11-13', today)).toBe('ok');
    expect(returnStatus('2026-11-12', today)).toBe('soon');
    expect(returnStatus(today, today)).toBe('soon');
    expect(returnStatus('2026-11-04', today)).toBe('overdue');
  });
});

describe('openReturns', () => {
  it('keeps a return until a consulta is registered from 7 days before it on', () => {
    const first = visit('a', '2026-10-01', '2026-11-01');
    expect(openReturns([first]).map((v) => v.id)).toEqual(['a']);
    expect(openReturns([first, visit('b', '2026-10-20', null)]).map((v) => v.id)).toEqual(['a']);
    expect(openReturns([first, visit('b', '2026-10-25', null)])).toEqual([]);
    expect(openReturns([first, visit('b', '2026-11-03', null, 'exame')]).map((v) => v.id)).toEqual(['a']);
  });
  it('ignores visits without a return', () => {
    expect(openReturns([visit('a', '2026-10-01', null)])).toEqual([]);
  });
});

describe('treatmentEndShows', () => {
  const med = (startOn: string, endOn: string | null) => ({ id: 'm', name: 'Antibiótico', startOn, endOn });
  it('shows from 7 days before the last day until that day', () => {
    expect(treatmentEndShows(med('2026-11-01', '2026-11-12'), today)).toBe(true);
    expect(treatmentEndShows(med('2026-11-01', '2026-11-13'), today)).toBe(false);
    expect(treatmentEndShows(med('2026-11-01', today), today)).toBe(true);
    expect(treatmentEndShows(med('2026-11-01', '2026-11-04'), today)).toBe(false);
  });
  it('never shows continuous use or a treatment that has not started', () => {
    expect(treatmentEndShows(med('2026-11-01', null), today)).toBe(false);
    expect(treatmentEndShows(med('2026-11-06', '2026-11-08'), today)).toBe(false);
  });
});

describe('pageDeadlines', () => {
  it('puts hygiene in "Exige" like the parasites', () => {
    const { demanded } = pageDeadlines(
      {
        ...empty,
        care: [
          { id: 'h', category: 'hygiene', item: 'Banho', doneOn: '2026-10-01', intervalDays: 15 },
          { id: 'p', category: 'parasite', item: 'Vermífugo', doneOn: '2026-08-01', intervalDays: 90 },
        ],
      },
      today,
    );
    expect(demanded.map((d) => [d.kind, d.state])).toEqual([
      ['hygiene', 'overdue'],
      ['parasite', 'overdue'],
    ]);
  });
  it('demands a late or close return, the soonest first', () => {
    const { demanded } = pageDeadlines({ ...empty, visits: [visit('a', '2026-10-01', '2026-11-10'), visit('b', '2026-09-01', '2026-11-01')] }, today);
    expect(demanded.map((d) => [d.id, d.kind, d.state])).toEqual([
      ['b', 'return', 'overdue'],
      ['a', 'return', 'soon'],
    ]);
  });
  it('shows the end of a treatment in "A seguir" only, never in "Exige"', () => {
    const { demanded, next } = pageDeadlines(
      {
        ...empty,
        doses: [{ id: 'v', vaccine: 'V10', appliedOn: '2026-06-01', intervalDays: 365 }],
        treatments: [{ id: 'm', name: 'Antibiótico', startOn: '2026-11-01', endOn: '2026-11-08' }],
      },
      today,
    );
    expect(demanded).toEqual([]);
    expect(next.map((d) => [d.kind, d.due])).toEqual([
      ['treatmentEnd', '2026-11-08'],
      ['vaccine', '2027-06-01'],
    ]);
  });
  it('keeps only the next two that are fine', () => {
    const { next } = pageDeadlines(
      {
        ...empty,
        doses: [
          { id: 'a', vaccine: 'V10', appliedOn: '2026-06-01', intervalDays: 365 },
          { id: 'b', vaccine: 'Raiva', appliedOn: '2026-07-01', intervalDays: 365 },
          { id: 'c', vaccine: 'Gripe', appliedOn: '2026-05-01', intervalDays: 365 },
        ],
      },
      today,
    );
    expect(next.map((d) => d.id)).toEqual(['c', 'a']);
  });
});
