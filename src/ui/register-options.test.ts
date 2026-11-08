import { describe, expect, it } from 'vitest';
import { REGISTER_OPTIONS, stepOfHash } from './register-options';

describe('REGISTER_OPTIONS', () => {
  it('lists only acontecimentos, named in the past, in the order of the +', () => {
    expect(REGISTER_OPTIONS.map((o) => o.label)).toEqual(['Vacina dada', 'Peso', 'Medicação dada', 'Higiene feita', 'Consulta ou exame', 'Algo estranho hoje']);
  });
});

describe('stepOfHash', () => {
  it('opens each option by its own hash', () => {
    for (const option of REGISTER_OPTIONS) expect(stepOfHash(`#${option.hash}`)).toBe(option.step);
  });
  it('sends the old "cuidado" link to the Medicação form', () => {
    expect(stepOfHash('cuidado')).toBe('parasite');
  });
  it('falls back to the menu for medication (out of the + until phase 3) and unknown hashes', () => {
    expect(stepOfHash('medicacao')).toBeNull();
    expect(stepOfHash('')).toBeNull();
  });
});
