import { describe, expect, it } from 'vitest';
import { normalizeEmergency, telHref } from './emergency';

describe('normalizeEmergency', () => {
  it('accepts an empty input as all blank', () => {
    expect(normalizeEmergency({})).toEqual({ vetName: null, vetPhone: null, clinicName: null, clinicPhone: null, planName: null, planNumber: null });
  });

  it('trims text and keeps phones as typed', () => {
    expect(normalizeEmergency({ vetName: '  Dra.  Ana ', vetPhone: '(11) 91234-5678', planName: ' ', clinicPhone: '+55 11 3000-1234' })).toMatchObject({
      vetName: 'Dra. Ana',
      vetPhone: '(11) 91234-5678',
      clinicPhone: '+55 11 3000-1234',
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

describe('telHref', () => {
  it('keeps digits and a leading plus', () => {
    expect(telHref('(11) 91234-5678')).toBe('tel:11912345678');
    expect(telHref('+55 11 3000-1234')).toBe('tel:+551130001234');
  });
});
