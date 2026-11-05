import { describe, expect, it } from 'vitest';
import { formatPhone, mapsDirectionsHref, normalizeEmergency, telHref } from './emergency';

describe('normalizeEmergency', () => {
  it('accepts an empty input as all blank', () => {
    expect(normalizeEmergency({})).toEqual({ vetName: null, vetPhone: null, clinicName: null, clinicPhone: null, clinicAddress: null, planName: null, planNumber: null });
  });

  it('trims text and formats phones', () => {
    expect(normalizeEmergency({ vetName: '  Dra.  Ana ', vetPhone: '(11) 91234-5678', planName: ' ', clinicPhone: '+55 11 3000-1234', clinicAddress: ' Rua A,  10 ' })).toMatchObject({
      vetName: 'Dra. Ana',
      vetPhone: '(11) 91234-5678',
      clinicPhone: '+55 (11) 3000-1234',
      clinicAddress: 'Rua A, 10',
      planName: null,
    });
  });

  it('refuses phones that are not phones, wrong types and long text', () => {
    expect(normalizeEmergency({ vetPhone: 'abc' })).toBeNull();
    expect(normalizeEmergency({ vetPhone: '123' })).toBeNull();
    expect(normalizeEmergency({ clinicPhone: 'javascript:alert(1)' })).toBeNull();
    expect(normalizeEmergency({ planName: 5 })).toBeNull();
    expect(normalizeEmergency({ planNumber: 'x'.repeat(81) })).toBeNull();
  });
});

describe('formatPhone', () => {
  it.each([
    ['11912345678', '(11) 91234-5678'],
    ['(11)91234 5678', '(11) 91234-5678'],
    ['1130001234', '(11) 3000-1234'],
    ['+5511912345678', '+55 (11) 91234-5678'],
    ['55 11 3000-1234', '+55 (11) 3000-1234'],
    ['011 91234-5678', '(11) 91234-5678'],
    ['912345678', '91234-5678'],
    ['30001234', '3000-1234'],
    ['0800 123 4567', '0800 123 4567'],
    ['08001234567', '0800 123 4567'],
    ['+1 415 555 0100', '+1 415 555 0100'],
  ])('%s -> %s', (input, expected) => expect(formatPhone(input)).toBe(expected));

  it('is idempotent', () => {
    expect(formatPhone(formatPhone('11912345678'))).toBe('(11) 91234-5678');
  });
});

describe('mapsDirectionsHref', () => {
  it('points to the address and leaves the origin to the current location', () => {
    const url = new URL(mapsDirectionsHref('Av. Paulista, 1000 - São Paulo'));
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('destination')).toBe('Av. Paulista, 1000 - São Paulo');
    expect(url.searchParams.has('origin')).toBe(false);
  });
});

describe('telHref', () => {
  it('keeps digits and a leading plus', () => {
    expect(telHref('(11) 91234-5678')).toBe('tel:11912345678');
    expect(telHref('+55 11 3000-1234')).toBe('tel:+551130001234');
  });
});
