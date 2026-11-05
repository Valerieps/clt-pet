import { describe, expect, it } from 'vitest';
import { isEnded, normalizeMedication } from './medication';

const base = { name: ' Apoquel ', dose: ' 1 comprimido ', frequency: 'daily2', startOn: '2026-11-01' };

describe('normalizeMedication', () => {
  it('trims and defaults the end date to continuous use', () => {
    expect(normalizeMedication(base)).toEqual({ name: 'Apoquel', dose: '1 comprimido', frequency: 'daily2', startOn: '2026-11-01', endOn: null });
  });

  it('takes an end date on or after the start', () => {
    expect(normalizeMedication({ ...base, endOn: '2026-11-01' })?.endOn).toBe('2026-11-01');
    expect(normalizeMedication({ ...base, endOn: '2026-10-31' })).toBeNull();
    expect(normalizeMedication({ ...base, endOn: '' })?.endOn).toBeNull();
  });

  it('refuses missing, blank or unknown fields', () => {
    expect(normalizeMedication({ ...base, name: '  ' })).toBeNull();
    expect(normalizeMedication({ ...base, dose: undefined })).toBeNull();
    expect(normalizeMedication({ ...base, frequency: 'hourly' })).toBeNull();
    expect(normalizeMedication({ ...base, startOn: '01/11/2026' })).toBeNull();
    expect(normalizeMedication({ ...base, name: 'x'.repeat(81) })).toBeNull();
  });
});

describe('isEnded', () => {
  it('ends the day after the end date', () => {
    expect(isEnded({ endOn: '2026-11-04' }, '2026-11-04')).toBe(false);
    expect(isEnded({ endOn: '2026-11-04' }, '2026-11-05')).toBe(true);
    expect(isEnded({ endOn: null }, '2030-01-01')).toBe(false);
  });
});
