import { beforeEach, describe, expect, it } from 'vitest';
import type { VaccinationView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

const VALERIA = 'souza.pereira.valeria@gmail.com';
let service: GroupService;

beforeEach(() => {
  service = new GroupService(memorySql(), fixedClock('2026-11-04T15:00:00Z'), sequentialIds());
  service.migrate();
  service.signIn({ sub: 's', email: VALERIA, name: 'Valéria', picture: null }, 'h-v', [VALERIA]);
});

const list = (): VaccinationView[] => (service.query('h-v', 'vaccinations', {}) as { value: VaccinationView[] }).value;

describe('vaccine.add', () => {
  it('registers one dose for several chefes at once', () => {
    const result = service.command('h-v', 'vaccine.add', {
      petIds: ['pet-berenice', 'pet-panda'],
      vaccine: 'V4',
      appliedOn: '2026-10-01',
      lot: ' L123 ',
    });
    expect(result).toMatchObject({ ok: true, changed: ['vaccinations'] });
    expect(list().map((v) => [v.petId, v.vaccine, v.intervalDays, v.lot, v.byName])).toEqual([
      ['pet-berenice', 'V4', 365, 'L123', 'Valéria'],
      ['pet-panda', 'V4', 365, 'L123', 'Valéria'],
    ]);
  });

  it('takes an edited interval', () => {
    service.command('h-v', 'vaccine.add', { petIds: ['pet-pacoca'], vaccine: 'Leishmaniose', appliedOn: '2026-10-01', intervalDays: 180 });
    expect(list()[0].intervalDays).toBe(180);
  });

  it('saves nothing when a chefe does not exist or the input is invalid', () => {
    const base = { vaccine: 'V4', appliedOn: '2026-10-01' };
    expect(service.command('h-v', 'vaccine.add', { ...base, petIds: ['pet-panda', 'nope'] })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command('h-v', 'vaccine.add', { ...base, petIds: [] })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'vaccine.add', { ...base, petIds: ['pet-panda'], appliedOn: '2026-11-05' })).toEqual({
      ok: false,
      error: 'invalid',
    });
    expect(list()).toEqual([]);
  });

  it('needs a signed-in member', () => {
    expect(service.command('nobody', 'vaccine.add', {})).toEqual({ ok: false, error: 'unauthenticated' });
  });
});

describe('vaccine.remove', () => {
  it('deletes a dose', () => {
    service.command('h-v', 'vaccine.add', { petIds: ['pet-panda'], vaccine: 'V4', appliedOn: '2026-10-01' });
    const [dose] = list();
    expect(service.command('h-v', 'vaccine.remove', { vaccinationId: dose.id })).toMatchObject({ ok: true });
    expect(list()).toEqual([]);
    expect(service.command('h-v', 'vaccine.remove', { vaccinationId: dose.id })).toEqual({ ok: false, error: 'not_found' });
  });
});
