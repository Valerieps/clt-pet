import { describe, expect, it } from 'vitest';
import { demandedDeadlines } from './deadlines';
import { petStatus } from './next-actions';
import { currentPrazos, normalizePlan, prazoStatus, routineDueAfter, visitOccurrences, type Occurrence, type Plan } from './prazos';

const today = '2026-11-04';
const record = (item: string, on: string, intervalDays: number): Occurrence => ({ id: `${item}-${on}`, item, on, intervalDays });
const plan = (item: string, dueOn: string, intervalDays = 90, kind: Plan['kind'] = 'parasite'): Plan => ({
  id: `plan-${item}`,
  kind,
  item,
  dueOn,
  intervalDays,
});

describe('currentPrazos', () => {
  it('counts from the latest record when nothing is planned', () => {
    const [p] = currentPrazos('parasite', [record('Vermífugo', '2026-06-01', 90), record('Vermífugo', '2026-09-01', 90)], [], today);
    expect(p).toMatchObject({ item: 'Vermífugo', due: '2026-11-30', lastOn: '2026-09-01', planId: null, state: 'ok' });
  });

  it('shows a planned item that never happened, after the recorded ones', () => {
    const list = currentPrazos('parasite', [record('Antipulgas', '2026-10-20', 30)], [plan('Vermífugo', '2026-11-06')], today);
    expect(list.map((p) => [p.item, p.due, p.lastOn, p.planId, p.state])).toEqual([
      ['Antipulgas', '2026-11-19', '2026-10-20', null, 'ok'],
      ['Vermífugo', '2026-11-06', null, 'plan-Vermífugo', 'soon'],
    ]);
  });

  it('lets a plan move the date of a recorded item, ignoring case', () => {
    const [p] = currentPrazos('parasite', [record('vermífugo', '2026-09-01', 90)], [plan('Vermífugo', '2026-10-01', 60)], today);
    expect(p).toMatchObject({ due: '2026-10-01', intervalDays: 60, lastOn: '2026-09-01', planId: 'plan-Vermífugo', state: 'overdue' });
  });

  it('only takes the plans of its own kind', () => {
    expect(currentPrazos('vaccine', [], [plan('Vermífugo', '2026-11-06')], today)).toEqual([]);
  });
});

describe('prazoStatus', () => {
  it('uses 30 days for vaccines and a quarter of the interval for care', () => {
    expect(prazoStatus('vaccine', '2026-12-04', 365, today)).toBe('soon');
    expect(prazoStatus('parasite', '2026-12-04', 365, today)).toBe('soon');
    expect(prazoStatus('parasite', '2026-11-12', 30, today)).toBe('ok'); // 7-day window
    expect(prazoStatus('hygiene', '2026-11-03', 15, today)).toBe('overdue');
  });
});

describe('normalizePlan', () => {
  it('requires the kind, the item, a real date (past or future) and the interval', () => {
    expect(normalizePlan({ kind: 'hygiene', item: ' Banho ', dueOn: '2025-01-01', intervalDays: 15 })).toEqual({
      kind: 'hygiene',
      item: 'Banho',
      dueOn: '2025-01-01',
      intervalDays: 15,
      dose: null,
    });
    expect(normalizePlan({ kind: 'hygiene', item: 'Banho', dueOn: '2027-01-01' })).toBeNull();
    expect(normalizePlan({ kind: 'hygiene', item: '', dueOn: '2027-01-01', intervalDays: 15 })).toBeNull();
    expect(normalizePlan({ kind: 'diet', item: 'Banho', dueOn: '2027-01-01', intervalDays: 15 })).toBeNull();
  });

  it('keeps a dose only on a medication', () => {
    expect(normalizePlan({ kind: 'parasite', item: 'Vermífugo', dueOn: '2027-01-01', intervalDays: 90, dose: ' 1 comprimido ' })).toMatchObject({
      dose: '1 comprimido',
    });
    expect(normalizePlan({ kind: 'parasite', item: 'Vermífugo', dueOn: '2027-01-01', intervalDays: 90, dose: '' })).toMatchObject({ dose: null });
    expect(normalizePlan({ kind: 'hygiene', item: 'Banho', dueOn: '2027-01-01', intervalDays: 15, dose: '1' })).toBeNull();
    expect(normalizePlan({ kind: 'parasite', item: 'Vermífugo', dueOn: '2027-01-01', intervalDays: 90, dose: 3 })).toBeNull();
  });

  it('accepts a routine consulta', () => {
    expect(normalizePlan({ kind: 'visit', item: 'Check-up', dueOn: '2027-01-01', intervalDays: 365 })).toMatchObject({ kind: 'visit' });
  });
});

describe('routine consultas', () => {
  const checkup = plan('Check-up', '2027-01-10', 365, 'visit');
  const visit = (id: string, onDate: string, title = 'check-up', kind = 'consulta') => ({ id, kind, onDate, title });

  it('counts only consultas already done whose subject is the planned item', () => {
    const list = visitOccurrences(
      [visit('a', '2026-01-10'), visit('b', '2026-12-01'), visit('c', '2026-02-01', 'Check-up', 'exame'), visit('d', '2026-03-01', 'Vacina')],
      [checkup],
      today,
    );
    expect(list).toEqual([{ id: 'a', item: 'Check-up', on: '2026-01-10', intervalDays: 365 }]);
    const [p] = currentPrazos('visit', list, [checkup], today);
    expect(p).toMatchObject({ item: 'Check-up', due: '2027-01-10', lastOn: '2026-01-10', planId: checkup.id, state: 'ok' });
  });

  it('a consulta done moves the plan forward, never back', () => {
    expect(routineDueAfter(checkup, '2026-11-04')).toBe('2027-11-04');
    expect(routineDueAfter(checkup, '2025-06-01')).toBeNull();
  });

  it('a routine consulta late or close demands attention on the page', () => {
    const demanded = demandedDeadlines({ doses: [], care: [], visits: [], plans: [plan('Check-up', '2026-11-01', 365, 'visit')] }, today);
    expect(demanded.map((d) => [d.kind, d.name, d.state])).toEqual([['visit', 'Check-up', 'overdue']]);
  });
});

describe('plans on the page and the home screen', () => {
  const pet = { id: 'p', name: 'Paçoca', seriousMode: false, allergiesAnswered: true };

  it('a planned vaccine due soon demands attention before any dose', () => {
    const status = petStatus(pet, [], today, null, [], [plan('V10', '2026-11-10', 365, 'vaccine')]);
    expect(status).toMatchObject({ needsAttention: true, vaccine: { item: 'Vacina V10', overdue: false, days: 6 } });
  });

  it('planned hygiene stays off the home screen but shows on the page', () => {
    const plans = [plan('Banho', '2026-11-05', 15, 'hygiene'), plan('Vermífugo', '2027-03-01')];
    expect(petStatus(pet, [], today, null, [], plans).needsAttention).toBe(false);
    const demanded = demandedDeadlines({ doses: [], care: [], visits: [], plans }, today);
    expect(demanded.map((d) => [d.kind, d.name])).toEqual([['hygiene', 'Banho']]);
  });
});
