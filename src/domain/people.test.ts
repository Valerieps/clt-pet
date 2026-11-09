import { describe, expect, it } from 'vitest';
import { firstName } from './people';

describe('firstName', () => {
  it('keeps the first name only, capitalized', () => {
    expect(firstName('valeria souza')).toBe('Valeria');
    expect(firstName('valeria')).toBe('Valeria');
    expect(firstName('Cesar')).toBe('Cesar');
    expect(firstName('CESAR GAMBOA MACHADO')).toBe('Cesar');
  });
  it('handles accents and extra spaces', () => {
    expect(firstName('  valéria  souza ')).toBe('Valéria');
    expect(firstName('ÉRICA LIMA')).toBe('Érica');
    expect(firstName('ana-clara souza')).toBe('Ana-Clara');
  });
  it('returns an empty string for an empty name', () => {
    expect(firstName('   ')).toBe('');
  });
});
