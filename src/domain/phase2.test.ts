import { describe, expect, it } from 'vitest';
import { careDueDate, careStatus, currentCare, normalizeCare, soonWindow } from './care/care';
import { normalizeCondition, normalizeVisit } from './health/health';
import { muralStatus } from './mural';
import { normalizeDiary, normalizeMeal } from './routine/routine';
import { isSitterTokenShape, normalizeSitterLink } from './sitter/sitter';

const TODAY = '2026-11-04';

describe('care', () => {
  it('computes the due date and the status with a window of a quarter of the interval', () => {
    const record = { item: 'Antipulgas', doneOn: '2026-10-10', intervalDays: 30 };
    expect(careDueDate(record)).toBe('2026-11-09');
    expect(soonWindow(30)).toBe(7);
    expect(soonWindow(7)).toBe(1);
    expect(soonWindow(365)).toBe(30);
    expect(careStatus(record, TODAY)).toBe('soon');
    expect(careStatus(record, '2026-11-01')).toBe('ok');
    expect(careStatus(record, '2026-11-10')).toBe('overdue');
  });

  it('keeps the latest record of each item, ignoring case', () => {
    const records = [
      { item: 'Vermífugo', doneOn: '2026-01-01', intervalDays: 90 },
      { item: 'vermífugo', doneOn: '2026-04-01', intervalDays: 90 },
      { item: 'Antipulgas', doneOn: '2026-02-01', intervalDays: 30 },
    ];
    expect(currentCare(records).map((r) => r.doneOn)).toEqual(['2026-04-01', '2026-02-01']);
  });

  it('validates the input', () => {
    expect(normalizeCare({ category: 'parasite', item: ' Vermífugo ', doneOn: TODAY, intervalDays: 90, note: ' Drontal ' }, TODAY)).toEqual({
      category: 'parasite',
      item: 'Vermífugo',
      doneOn: TODAY,
      intervalDays: 90,
      note: 'Drontal',
    });
    expect(normalizeCare({ category: 'other', item: 'x', doneOn: TODAY }, TODAY)).toBeNull();
    expect(normalizeCare({ category: 'hygiene', item: '', doneOn: TODAY }, TODAY)).toBeNull();
    expect(normalizeCare({ category: 'hygiene', item: 'Banho', doneOn: '2026-11-05' }, TODAY)).toBeNull();
    expect(normalizeCare({ category: 'hygiene', item: 'Banho', doneOn: TODAY, intervalDays: 0 }, TODAY)).toBeNull();
  });
});

describe('health', () => {
  it('takes a condition with only the name', () => {
    expect(normalizeCondition({ name: ' Doença renal ' }, TODAY)).toEqual({ name: 'Doença renal', grave: false, since: null, notes: null });
    expect(normalizeCondition({ name: 'Sopro', grave: true, since: '2025-01-01' }, TODAY)).toMatchObject({ grave: true, since: '2025-01-01' });
    expect(normalizeCondition({ name: 'Sopro', since: '2026-12-01' }, TODAY)).toBeNull();
    expect(normalizeCondition({ name: '' }, TODAY)).toBeNull();
    expect(normalizeCondition({ name: 'x', grave: 'yes' }, TODAY)).toBeNull();
  });

  it('lets a consulta be scheduled but not an exame', () => {
    const base = { title: 'Check-up', onDate: '2026-12-01' };
    expect(normalizeVisit({ ...base, kind: 'consulta' }, TODAY)).toMatchObject({ kind: 'consulta', onDate: '2026-12-01', returnOn: null });
    expect(normalizeVisit({ ...base, kind: 'exame' }, TODAY)).toBeNull();
    expect(normalizeVisit({ ...base, kind: 'laudo', onDate: TODAY, returnOn: '2026-11-01' }, TODAY)).toBeNull();
    expect(normalizeVisit({ ...base, kind: 'consulta', returnOn: '2026-12-15' }, TODAY)?.returnOn).toBe('2026-12-15');
    expect(normalizeVisit({ ...base, kind: 'cirurgia' }, TODAY)).toBeNull();
  });
});

describe('routine', () => {
  it('takes a diary entry dated today by default', () => {
    expect(normalizeDiary({ text: ' Vomitou bola de pelo ' }, TODAY)).toEqual({ onDate: TODAY, text: 'Vomitou bola de pelo' });
    expect(normalizeDiary({ text: 'x', onDate: '2026-11-05' }, TODAY)).toBeNull();
    expect(normalizeDiary({ text: '   ' }, TODAY)).toBeNull();
    expect(normalizeDiary({ text: 'x'.repeat(501) }, TODAY)).toBeNull();
  });

  it('takes a meal with a valid time', () => {
    expect(normalizeMeal({ at: '07:30', amount: '40 g' })).toEqual({ at: '07:30', amount: '40 g', note: null });
    expect(normalizeMeal({ at: '24:00' })).toBeNull();
    expect(normalizeMeal({ at: '7:30' })).toBeNull();
  });
});

describe('sitter link', () => {
  it('counts today as the first day', () => {
    expect(normalizeSitterLink({ label: ' Ana ', petIds: ['a', 'a', 'b'], days: 3 }, TODAY)).toEqual({
      label: 'Ana',
      petIds: ['a', 'b'],
      note: null,
      expiresOn: '2026-11-06',
    });
    expect(normalizeSitterLink({ label: 'Ana', petIds: ['a'] }, TODAY)?.expiresOn).toBe('2026-11-10');
  });

  it('refuses a link without chefes, label or a sane length', () => {
    expect(normalizeSitterLink({ label: 'Ana', petIds: [] }, TODAY)).toBeNull();
    expect(normalizeSitterLink({ label: '', petIds: ['a'] }, TODAY)).toBeNull();
    expect(normalizeSitterLink({ label: 'Ana', petIds: ['a'], days: 91 }, TODAY)).toBeNull();
    expect(normalizeSitterLink({ label: 'Ana', petIds: [1] }, TODAY)).toBeNull();
  });

  it('knows the shape of a token', () => {
    expect(isSitterTokenShape('a'.repeat(64))).toBe(true);
    expect(isSitterTokenShape('a'.repeat(63))).toBe(false);
  });
});

describe('mural with parasites', () => {
  const pet = { id: 'p', name: 'Paçoca', seriousMode: false, allergiesAnswered: true };

  it('demands attention for a late parasite care, like a vaccine', () => {
    const status = muralStatus(pet, [], TODAY, null, [{ item: 'Vermífugo', doneOn: '2026-07-01', intervalDays: 90 }]);
    expect(status.needsAttention).toBe(true);
    expect(status.vaccine).toEqual({ item: 'Vermífugo', overdue: true, days: 36 });
  });

  it('picks the earliest due among vaccines and parasites', () => {
    const status = muralStatus(pet, [{ vaccine: 'V10', appliedOn: '2025-11-20', intervalDays: 365 }], TODAY, null, [
      { item: 'Antipulgas', doneOn: '2026-10-08', intervalDays: 30 },
    ]);
    expect(status.vaccine?.item).toBe('Antipulgas');
  });
});
