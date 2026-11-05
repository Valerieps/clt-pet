import { describe, expect, it } from 'vitest';
import { ageParts, birthDateFromAge, formatAge, missingFields, normalizeProfile, normalizeTags, type PetProfile } from './pet';
import { formatKilos, latestWeight, parseKilos, weightAlert } from './weight';

const TODAY = '2026-11-04';

describe('normalizeProfile', () => {
  it('needs only a name', () => {
    expect(normalizeProfile({ name: '  Panda ' }, TODAY)).toMatchObject({ name: 'Panda', breed: null, birthDate: null, allergies: [] });
    expect(normalizeProfile({ name: '   ' }, TODAY)).toBeNull();
    expect(normalizeProfile({}, TODAY)).toBeNull();
  });

  it('rejects wrong types, dates in the future and impossible dates', () => {
    expect(normalizeProfile({ name: 'A', sex: 'x' }, TODAY)).toBeNull();
    expect(normalizeProfile({ name: 'A', neutered: 'sim' }, TODAY)).toBeNull();
    expect(normalizeProfile({ name: 'A', birthDate: '2026-11-05' }, TODAY)).toBeNull();
    expect(normalizeProfile({ name: 'A', birthDate: '2026-02-30' }, TODAY)).toBeNull();
    expect(normalizeProfile({ name: 'A', birthDate: '2020-02-29' }, TODAY)).toMatchObject({ birthDate: '2020-02-29' });
    expect(normalizeProfile({ name: 'A', breed: 'x'.repeat(81) }, TODAY)).toBeNull();
  });

  it('keeps allergies, dropping blank ones', () => {
    const profile = normalizeProfile(
      { name: 'A', allergies: [{ kind: 'drug', description: ' Dipirona ' }, { kind: 'food', description: '  ' }] },
      TODAY,
    );
    expect(profile?.allergies).toEqual([{ kind: 'drug', description: 'Dipirona' }]);
    expect(normalizeProfile({ name: 'A', allergies: [{ kind: 'other', description: 'x' }] }, TODAY)).toBeNull();
    expect(normalizeProfile({ name: 'A', allergies: 'x' }, TODAY)).toBeNull();
  });
});

describe('missingFields', () => {
  const empty = normalizeProfile({ name: 'A' }, TODAY) as PetProfile;
  it('lists everything that is blank', () => {
    expect(missingFields(empty, false)).toEqual(['breed', 'birthDate', 'sex', 'neutered', 'microchip', 'food', 'allergies']);
  });
  it('is empty when complete', () => {
    const full = normalizeProfile(
      { name: 'A', breed: 'SRD', birthDate: '2020-01-01', sex: 'male', neutered: true, microchip: '1', foodKind: 'dry', foodBrand: 'X', foodDaily: '60 g' },
      TODAY,
    ) as PetProfile;
    expect(missingFields(full, true)).toEqual([]);
  });
});

describe('weight', () => {
  it('parses kilos with comma or dot', () => {
    expect(parseKilos('4,2')).toBe(4200);
    expect(parseKilos('4.25')).toBe(4250);
    expect(parseKilos('0,05')).toBeNull();
    expect(parseKilos('abc')).toBeNull();
    expect(parseKilos('-3')).toBeNull();
    expect(formatKilos(4200)).toBe('4,2 kg');
  });

  it('finds the latest weight', () => {
    expect(latestWeight([])).toBeNull();
    expect(latestWeight([{ grams: 1, onDate: '2026-01-02' }, { grams: 2, onDate: '2026-03-01' }])?.grams).toBe(2);
  });

  it('alerts on 10% within 60 days, either direction', () => {
    const lost = [
      { grams: 4000, onDate: '2026-09-10' },
      { grams: 3500, onDate: '2026-11-01' },
    ];
    expect(weightAlert(lost, 10)).toMatchObject({ percent: -12.5, fromGrams: 4000, toGrams: 3500 });
    expect(weightAlert([{ grams: 4000, onDate: '2026-09-10' }, { grams: 4500, onDate: '2026-11-01' }], 10)?.percent).toBe(12.5);
  });

  it('does not alert below the limit, outside 60 days, or with one weight', () => {
    expect(weightAlert([{ grams: 4000, onDate: '2026-09-10' }, { grams: 3700, onDate: '2026-11-01' }], 10)).toBeNull();
    expect(weightAlert([{ grams: 4000, onDate: '2026-08-01' }, { grams: 3000, onDate: '2026-11-01' }], 10)).toBeNull();
    expect(weightAlert([{ grams: 4000, onDate: '2026-11-01' }], 10)).toBeNull();
    expect(weightAlert([{ grams: 4000, onDate: '2026-09-10' }, { grams: 3700, onDate: '2026-11-01' }], 5)).not.toBeNull();
  });
});

describe('normalizeTags', () => {
  it('trims, drops blanks and repeats, and caps the count', () => {
    expect(normalizeTags([' Exigente ', '', 'exigente', 'Juíza'])).toEqual(['Exigente', 'Juíza']);
    expect(normalizeTags(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toBeNull();
    expect(normalizeTags(['x'.repeat(41)])).toBeNull();
    expect(normalizeTags('a')).toBeNull();
    expect(normalizeTags([3])).toBeNull();
  });
});

describe('estimated age', () => {
  it('turns years and months into a birth date, clamping the day', () => {
    expect(birthDateFromAge(3, 0, '2026-11-04')).toBe('2023-11-04');
    expect(birthDateFromAge(0, 8, '2026-11-04')).toBe('2026-03-04');
    expect(birthDateFromAge(1, 9, '2026-11-04')).toBe('2025-02-04');
    expect(birthDateFromAge(0, 9, '2026-11-30')).toBe('2026-02-28');
    expect(birthDateFromAge(0, 0, '2026-11-04')).toBeNull();
    expect(birthDateFromAge(1, 12, '2026-11-04')).toBeNull();
    expect(birthDateFromAge(-1, 0, '2026-11-04')).toBeNull();
  });

  it('writes the age in words', () => {
    expect(formatAge('2023-11-04', '2026-11-04')).toBe('3 anos');
    expect(formatAge('2025-09-04', '2026-11-04')).toBe('1 ano e 2 meses');
    expect(formatAge('2026-03-04', '2026-11-04')).toBe('8 meses');
    expect(formatAge('2026-10-05', '2026-11-04')).toBe('menos de 1 mês');
    expect(ageParts('2025-09-04', '2026-11-04')).toEqual({ years: 1, months: 2 });
  });
});
