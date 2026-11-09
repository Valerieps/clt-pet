import { describe, expect, it } from 'vitest';
import { auraClass, currentPath, dateLabel, initialOf, swipeTarget, tabOfHash } from './navigation';

describe('tabOfHash', () => {
  it('opens the new tabs by their own hash', () => {
    expect(['agendamentos', 'ficha', 'perfil'].map(tabOfHash)).toEqual(['agendamentos', 'ficha', 'perfil']);
  });
  it('keeps the old hashes working, as push and the home screen send them', () => {
    expect(['prazos', 'historico', 'vacinas', 'cuidados', 'medicacoes', 'tratamentos', 'consultas'].map(tabOfHash)).toEqual(Array(7).fill('agendamentos'));
    expect(['saude', 'diario', 'condicoes', 'peso'].map(tabOfHash)).toEqual(Array(4).fill('ficha'));
    expect(['rotina', 'perfil', 'tutoria'].map(tabOfHash)).toEqual(['perfil', 'perfil', 'perfil']);
  });
  it('accepts the leading # and ignores unknown hashes', () => {
    expect(tabOfHash('#vacinas')).toBe('agendamentos');
    expect(tabOfHash('')).toBeNull();
    expect(tabOfHash('abas')).toBeNull();
  });
});

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

describe('dateLabel', () => {
  it('drops "-feira" and capitalizes', () => {
    expect(dateLabel(new Date(2026, 10, 2))).toBe('Segunda, 2 de novembro');
  });
  it('keeps weekends as they are', () => {
    expect(dateLabel(new Date(2026, 10, 7))).toBe('Sábado, 7 de novembro');
  });
});

describe('swipeTarget', () => {
  const order = ['/', '/pets/a', '/pets/b'];
  it('goes to the next screen on a swipe left and the previous on a swipe right', () => {
    expect(swipeTarget(order, '/pets/a', -80, 0)).toBe('/pets/b');
    expect(swipeTarget(order, '/pets/a', 80, 0)).toBe('/');
  });
  it('stops at the ends', () => {
    expect(swipeTarget(order, '/', 80, 0)).toBeNull();
    expect(swipeTarget(order, '/pets/b', -80, 0)).toBeNull();
  });
  it('ignores short or diagonal swipes and screens outside the order', () => {
    expect(swipeTarget(order, '/pets/a', -30, 0)).toBeNull();
    expect(swipeTarget(order, '/pets/a', -80, 70)).toBeNull();
    expect(swipeTarget(order, '/membros', -80, 0)).toBeNull();
  });
});

describe('currentPath', () => {
  it('moves the old /chefes addresses to /pets', () => {
    expect(currentPath('/chefes')).toBe('/pets');
    expect(currentPath('/chefes/abc')).toBe('/pets/abc');
    expect(currentPath('/chefes/abc/registrar')).toBe('/pets/abc/registrar');
  });
  it('leaves every other path alone', () => {
    expect(['/', '/pets/abc', '/chefesx', '/sos/abc'].map(currentPath)).toEqual(['/', '/pets/abc', '/chefesx', '/sos/abc']);
  });
});
