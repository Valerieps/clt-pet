import { describe, expect, it } from 'vitest';
import { auraClass, dateLabel, dueLabel, initialOf, nameSize, NAME_SIZE_MAX, NAME_SIZE_MIN, swipeTarget } from './navigation';

describe('auraClass', () => {
  it('cycles through the three auras', () => {
    expect([0, 1, 2, 3, 4].map(auraClass)).toEqual(['aura-ber', 'aura-pan', 'aura-pac', 'aura-ber', 'aura-pan']);
  });
});

describe('initialOf', () => {
  it('uppercases the first letter, accents included', () => {
    expect(initialOf('  paçoca')).toBe('P');
    expect(initialOf('érica')).toBe('É');
  });
  it('falls back to a question mark', () => {
    expect(initialOf('   ')).toBe('?');
  });
});

describe('nameSize', () => {
  it('shrinks long names and caps short ones', () => {
    expect(nameSize('Panda')).toBe(NAME_SIZE_MAX);
    expect(nameSize('Berenice')).toBeLessThan(nameSize('Paçoca'));
    expect(nameSize('Paçoca')).toBeLessThan(NAME_SIZE_MAX);
  });
  it('keeps a 20-letter name narrower than a small phone', () => {
    // Anton capitals are about 0.42em wide; 343px is a 375px screen minus the hero gutters.
    expect(nameSize('A'.repeat(20)) * 0.42 * 20).toBeLessThanOrEqual(343);
  });
  it('never goes below the minimum', () => {
    expect(nameSize('Sebastiana da Silva Pereira Souza')).toBe(NAME_SIZE_MIN);
  });
});

describe('dateLabel', () => {
  it('drops "-feira" and capitalizes', () => {
    expect(dateLabel(new Date(2026, 10, 2))).toBe('Segunda, 2 de novembro');
  });
  it('keeps weekends as they are', () => {
    expect(dateLabel(new Date(2026, 10, 7))).toBe('Sábado, 7 de novembro');
  });
});

describe('dueLabel', () => {
  it('counts days ahead', () => {
    expect(dueLabel(false, 6)).toBe('6 dias');
    expect(dueLabel(false, 1)).toBe('1 dia');
    expect(dueLabel(false, 0)).toBe('hoje');
  });
  it('counts days late', () => {
    expect(dueLabel(true, 3)).toBe('atrasada há 3 dias');
    expect(dueLabel(true, 1)).toBe('atrasada há 1 dia');
  });
});

describe('swipeTarget', () => {
  const order = ['/', '/chefes/a', '/chefes/b'];
  it('goes to the next screen on a swipe left and the previous on a swipe right', () => {
    expect(swipeTarget(order, '/chefes/a', -80, 0)).toBe('/chefes/b');
    expect(swipeTarget(order, '/chefes/a', 80, 0)).toBe('/');
  });
  it('stops at the ends', () => {
    expect(swipeTarget(order, '/', 80, 0)).toBeNull();
    expect(swipeTarget(order, '/chefes/b', -80, 0)).toBeNull();
  });
  it('ignores short or diagonal swipes and screens outside the order', () => {
    expect(swipeTarget(order, '/chefes/a', -30, 0)).toBeNull();
    expect(swipeTarget(order, '/chefes/a', -80, 70)).toBeNull();
    expect(swipeTarget(order, '/membros', -80, 0)).toBeNull();
  });
});
