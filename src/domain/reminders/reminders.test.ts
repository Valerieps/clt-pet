import { describe, expect, it } from 'vitest';
import { brasiliaTime, daysBetween, daysFor, dueStages } from './reminders';

// 12:00 UTC is 09:00 in Brasília.
const at = (date: string, time = '12:00:00') => new Date(`${date}T${time}Z`);

describe('brasiliaTime', () => {
  it('is three hours behind UTC, across the date line', () => {
    expect(brasiliaTime(at('2026-11-04', '02:30:00'))).toEqual({ date: '2026-11-03', hour: 23 });
    expect(brasiliaTime(at('2026-11-04', '12:00:00'))).toEqual({ date: '2026-11-04', hour: 9 });
  });
});

describe('daysBetween', () => {
  it('counts whole days, signed', () => {
    expect(daysBetween('2026-11-04', '2026-12-04')).toBe(30);
    expect(daysBetween('2026-11-04', '2026-11-01')).toBe(-3);
  });
});

describe('dueStages', () => {
  it('sends nothing before 9h', () => {
    expect(dueStages('2026-11-04', at('2026-11-04', '11:59:00'))).toEqual([]);
  });

  it('sends nothing more than 30 days ahead', () => {
    expect(dueStages('2026-12-05', at('2026-11-04'))).toEqual([]);
  });

  it('is 30d from 30 days until 8 days before', () => {
    expect(dueStages('2026-12-04', at('2026-11-04'))).toEqual(['30d']);
    expect(dueStages('2026-11-12', at('2026-11-04'))).toEqual(['30d']);
  });

  it('is 7d from a week before until the day before', () => {
    expect(dueStages('2026-11-11', at('2026-11-04'))).toEqual(['7d']);
    expect(dueStages('2026-11-05', at('2026-11-04'))).toEqual(['7d']);
  });

  it('is due on the day itself', () => {
    expect(dueStages('2026-11-04', at('2026-11-04'))).toEqual(['due']);
  });

  it('also warns the reserva once the date has passed', () => {
    expect(dueStages('2026-11-03', at('2026-11-04'))).toEqual(['due', 'escalated']);
    expect(dueStages('2026-10-01', at('2026-11-04'))).toEqual(['due', 'escalated']);
  });
});

describe('daysFor', () => {
  it('is days left before the date and days late after it', () => {
    expect(daysFor('2026-11-11', at('2026-11-04'))).toBe(7);
    expect(daysFor('2026-11-01', at('2026-11-04'))).toBe(3);
  });
});
