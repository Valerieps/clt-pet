import { describe, expect, it } from 'vitest';
import { dueLabel, intervalLabel, spanText } from './due-text';

describe('spanText', () => {
  it('says days under 60', () => {
    expect(spanText(1)).toBe('1 dia');
    expect(spanText(59)).toBe('59 dias');
  });
  it('says months from 60 days up to 23 months', () => {
    expect(spanText(60)).toBe('2 meses');
    expect(spanText(87)).toBe('3 meses');
    expect(spanText(365)).toBe('12 meses');
    expect(spanText(700)).toBe('23 meses');
  });
  it('says years beyond that', () => {
    expect(spanText(730)).toBe('2 anos');
    expect(spanText(1100)).toBe('3 anos');
  });
});

describe('dueLabel', () => {
  it('names today, tomorrow and yesterday', () => {
    expect(dueLabel(false, 0)).toBe('hoje');
    expect(dueLabel(true, 0)).toBe('hoje');
    expect(dueLabel(false, 1)).toBe('amanhã');
    expect(dueLabel(true, 1)).toBe('ontem');
  });
  it('looks ahead and back', () => {
    expect(dueLabel(false, 6)).toBe('em 6 dias');
    expect(dueLabel(false, 365)).toBe('em 12 meses');
    expect(dueLabel(true, 3)).toBe('há 3 dias');
    expect(dueLabel(true, 200)).toBe('há 7 meses');
  });
});

describe('intervalLabel', () => {
  it('calls a year "anual"', () => {
    expect(intervalLabel(365)).toBe('anual');
    expect(intervalLabel(366)).toBe('anual');
  });
  it('turns multiples of 30 days into months', () => {
    expect(intervalLabel(30)).toBe('mensal');
    expect(intervalLabel(90)).toBe('a cada 3 meses');
    expect(intervalLabel(180)).toBe('a cada 6 meses');
  });
  it('keeps days for the rest, and years for whole years', () => {
    expect(intervalLabel(1)).toBe('todo dia');
    expect(intervalLabel(14)).toBe('a cada 14 dias');
    expect(intervalLabel(730)).toBe('a cada 2 anos');
  });
});
