import { beforeEach, describe, expect, it } from 'vitest';
import type { MedicationView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

const VALERIA = 'souza.pereira.valeria@gmail.com';
let service: GroupService;

beforeEach(() => {
  service = new GroupService(memorySql(), fixedClock('2026-11-04T15:00:00Z'), sequentialIds());
  service.migrate();
  service.signIn({ sub: 's', email: VALERIA, name: 'Valéria', picture: null }, 'h-v', [VALERIA]);
});

const list = (): MedicationView[] => (service.query('h-v', 'medications', {}) as { value: MedicationView[] }).value;
const input = { petId: 'pet-panda', name: 'Apoquel', dose: '1 comprimido', frequency: 'daily2', startOn: '2026-11-01' };

describe('medication.add', () => {
  it('registers a medication for one pet', () => {
    const result = service.command('h-v', 'medication.add', { ...input, endOn: '2026-11-15' });
    expect(result).toMatchObject({ ok: true, changed: ['medications'] });
    expect(list().map((m) => [m.petId, m.name, m.dose, m.frequency, m.startOn, m.endOn, m.byName])).toEqual([
      ['pet-panda', 'Apoquel', '1 comprimido', 'daily2', '2026-11-01', '2026-11-15', 'Valéria'],
    ]);
  });

  it('is continuous use without an end date', () => {
    service.command('h-v', 'medication.add', input);
    expect(list()[0].endOn).toBeNull();
  });

  it('saves nothing when the pet does not exist or the input is invalid', () => {
    expect(service.command('h-v', 'medication.add', { ...input, petId: 'nope' })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command('h-v', 'medication.add', { ...input, frequency: 'hourly' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'medication.add', { ...input, endOn: '2026-10-01' })).toEqual({ ok: false, error: 'invalid' });
    expect(list()).toEqual([]);
  });

  it('needs a signed-in member', () => {
    expect(service.command('nobody', 'medication.add', {})).toEqual({ ok: false, error: 'unauthenticated' });
  });
});

describe('medication.remove', () => {
  it('deletes a medication', () => {
    service.command('h-v', 'medication.add', input);
    const [medication] = list();
    expect(service.command('h-v', 'medication.remove', { medicationId: medication.id })).toMatchObject({ ok: true });
    expect(list()).toEqual([]);
    expect(service.command('h-v', 'medication.remove', { medicationId: medication.id })).toEqual({ ok: false, error: 'not_found' });
  });
});
