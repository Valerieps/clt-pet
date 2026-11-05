import { beforeEach, describe, expect, it } from 'vitest';
import type { PetView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';
import type { GoogleProfile } from './members';

const VALERIA = 'souza.pereira.valeria@gmail.com';
const CESAR = 'csrgamboa@gmail.com';
const profile = (email: string, name: string): GoogleProfile => ({ sub: `sub:${email}`, email, name, picture: null });

let service: GroupService;
let clock: ReturnType<typeof fixedClock>;

beforeEach(() => {
  clock = fixedClock('2026-11-04T15:00:00Z');
  service = new GroupService(memorySql(), clock, sequentialIds());
  service.migrate();
  service.signIn(profile(VALERIA, 'Valéria'), 'h-v', [VALERIA]);
  service.command('h-v', 'invite.create', { email: CESAR });
  service.signIn(profile(CESAR, 'Cesar'), 'h-c', []);
});

function pets(session = 'h-v'): PetView[] {
  const result = service.query(session, 'pets', {});
  if (!result.ok) throw new Error(result.error);
  return result.value as PetView[];
}
const pet = (name: string) => pets().find((p) => p.profile.name === name) as PetView;

describe('the chefes that start registered', () => {
  it('are Berenice, Panda and Paçoca, with tags and the tutor tied by e-mail', () => {
    expect(pets().map((p) => [p.profile.name, p.species, p.tutorName])).toEqual([
      ['Berenice', 'cat', 'Valéria'],
      ['Panda', 'cat', 'Valéria'],
      ['Paçoca', 'dog', 'Cesar'],
    ]);
    expect(pet('Paçoca').tags).toEqual(['Diretora de Festas', 'Auditora de Petiscos', 'Carisma em Grau de Urgência']);
    expect(pet('Berenice').profile).toMatchObject({ breed: null, birthDate: null, allergies: [] });
    expect(pet('Berenice').allergiesAnswered).toBe(false);
  });

  it('wait for the tutor to sign in, then point to the account', () => {
    const fresh = new GroupService(memorySql(), clock, sequentialIds());
    fresh.migrate();
    fresh.signIn(profile(CESAR, 'Cesar'), 'h-c', [CESAR]);
    const list = (fresh.query('h-c', 'pets', {}) as { value: PetView[] }).value;
    expect(list.map((p) => p.tutorName)).toEqual([null, null, 'Cesar']);
    expect(list[0].tutorEmail).toBe(VALERIA);
  });

  it('need a signed-in member', () => {
    expect(service.query('nobody', 'pets', {})).toEqual({ ok: false, error: 'unauthenticated' });
  });
});

describe('pet.update', () => {
  const full = (petId: string) => ({
    petId,
    name: 'Panda',
    breed: 'SRD',
    birthDate: '2020-05-01',
    sex: 'male',
    neutered: true,
    microchip: '123',
    foodKind: 'wet',
    foodBrand: 'Marca',
    foodDaily: '3 sachês',
    weightAlertPercent: 8,
    allergies: [{ kind: 'drug', description: 'Dipirona' }],
  });

  it('lets either tutor edit any chefe and keeps the species', () => {
    const panda = pet('Panda');
    const result = service.command('h-c', 'pet.update', full(panda.id));
    expect(result).toMatchObject({ ok: true, changed: ['pets'], value: { species: 'cat', weightAlertPercent: 8, allergiesAnswered: true } });
    expect(pet('Panda').profile).toMatchObject({ breed: 'SRD', neutered: true, foodKind: 'wet', allergies: [{ kind: 'drug', description: 'Dipirona' }] });
  });

  it('replaces the allergies on every save', () => {
    const { id } = pet('Panda');
    service.command('h-v', 'pet.update', full(id));
    service.command('h-v', 'pet.update', { ...full(id), allergies: [] });
    expect(pet('Panda').profile.allergies).toEqual([]);
    expect(pet('Panda').allergiesAnswered).toBe(true);
  });

  it('refuses bad input and unknown chefes', () => {
    const { id } = pet('Panda');
    expect(service.command('h-v', 'pet.update', { ...full(id), name: ' ' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'pet.update', { ...full(id), weightAlertPercent: 0 })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'pet.update', { ...full(id), birthDate: '2030-01-01' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'pet.update', full('nope'))).toEqual({ ok: false, error: 'not_found' });
    expect(pet('Panda').profile.breed).toBeNull();
  });
});

describe('pet.setTutor', () => {
  it('hands the chefe to another active member', () => {
    const cesar = (service.query('h-c', 'me', {}) as { value: { id: string } }).value;
    const { id } = pet('Panda');
    expect(service.command('h-v', 'pet.setTutor', { petId: id, memberId: cesar.id })).toMatchObject({
      ok: true,
      value: { tutorName: 'Cesar', tutorEmail: CESAR },
    });
  });

  it('refuses unknown members', () => {
    expect(service.command('h-v', 'pet.setTutor', { petId: pet('Panda').id, memberId: 'nope' })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command('h-v', 'pet.setTutor', { petId: pet('Panda').id })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('weights', () => {
  it('records who weighed, in date order', () => {
    const { id } = pet('Berenice');
    service.command('h-v', 'weight.add', { petId: id, grams: 4200, onDate: '2026-11-03' });
    service.command('h-c', 'weight.add', { petId: id, grams: 4000, onDate: '2026-10-01' });
    expect(pet('Berenice').weights.map((w) => [w.grams, w.onDate, w.byName])).toEqual([
      [4000, '2026-10-01', 'Cesar'],
      [4200, '2026-11-03', 'Valéria'],
    ]);
  });

  it('refuses implausible weights and future dates, judged in Brasília time', () => {
    const { id } = pet('Berenice');
    expect(service.command('h-v', 'weight.add', { petId: id, grams: 5, onDate: '2026-11-03' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'weight.add', { petId: id, grams: 4.5, onDate: '2026-11-03' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'weight.add', { petId: id, grams: 4000, onDate: '2026-11-05' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'weight.add', { petId: id, grams: 4000, onDate: '2026-11-04' })).toMatchObject({ ok: true });
    clock.set('2026-11-05T01:00:00Z'); // still 4 Nov at 22h in Brasília
    expect(service.command('h-v', 'weight.add', { petId: id, grams: 4000, onDate: '2026-11-05' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('can be removed', () => {
    const { id } = pet('Berenice');
    const added = service.command('h-v', 'weight.add', { petId: id, grams: 4200, onDate: '2026-11-03' });
    const weightId = (added as { value: PetView }).value.weights[0].id;
    expect(service.command('h-v', 'weight.remove', { weightId })).toMatchObject({ ok: true, value: { weights: [] } });
    expect(service.command('h-v', 'weight.remove', { weightId })).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('pet.setTags', () => {
  it('replaces the tags, keeping the order', () => {
    const { id } = pet('Panda');
    const result = service.command('h-c', 'pet.setTags', { petId: id, tags: ['  Dorminhoco ', 'Fofo'] });
    expect(result).toMatchObject({ ok: true, changed: ['pets'], value: { tags: ['Dorminhoco', 'Fofo'] } });
    expect(pet('Panda').tags).toEqual(['Dorminhoco', 'Fofo']);
  });

  it('refuses repeats beyond the limit, wrong types and unknown chefes', () => {
    const { id } = pet('Panda');
    expect(service.command('h-v', 'pet.setTags', { petId: id, tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'pet.setTags', { petId: id, tags: [1] })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'pet.setTags', { petId: id, tags: 'a' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'pet.setTags', { petId: 'nope', tags: [] })).toEqual({ ok: false, error: 'not_found' });
    expect(pet('Panda').tags).toHaveLength(3);
  });
});

describe('pet.setPhoto', () => {
  const jpeg = '/9j/4AAQSkZJRgABAQ=='; // starts like a JPEG
  it('stores, serves and removes the photo, changing its version each time', () => {
    const { id } = pet('Paçoca');
    expect(pet('Paçoca').photoVersion).toBeNull();
    expect(service.photo('h-v', id)).toBeNull();
    const first = service.command('h-c', 'pet.setPhoto', { petId: id, image: jpeg }) as { value: PetView };
    expect(first.value.photoVersion).not.toBeNull();
    expect(service.photo('h-v', id)).toBe(jpeg);
    clock.set('2026-11-04T16:00:00Z');
    const second = service.command('h-c', 'pet.setPhoto', { petId: id, image: jpeg }) as { value: PetView };
    expect(second.value.photoVersion).not.toBe(first.value.photoVersion);
    expect(service.command('h-c', 'pet.setPhoto', { petId: id, image: null })).toMatchObject({ ok: true, value: { photoVersion: null } });
    expect(service.photo('h-v', id)).toBeNull();
  });

  it('refuses what is not a small JPEG and hides the photo from strangers', () => {
    const { id } = pet('Paçoca');
    for (const image of ['iVBORw0KGgo=', 'not base64!', 42, '/9j/' + 'A'.repeat(400_000)]) {
      expect(service.command('h-v', 'pet.setPhoto', { petId: id, image })).toEqual({ ok: false, error: 'invalid' });
    }
    service.command('h-v', 'pet.setPhoto', { petId: id, image: jpeg });
    expect(service.photo('nobody', id)).toBeNull();
  });
});

describe('estimated age', () => {
  it('is saved with the birth date and dropped without a date', () => {
    const { id } = pet('Berenice');
    const base = { petId: id, name: 'Berenice', weightAlertPercent: 10 };
    expect(service.command('h-v', 'pet.update', { ...base, birthDate: '2023-11-04', birthEstimated: true })).toMatchObject({
      ok: true,
      value: { profile: { birthDate: '2023-11-04', birthEstimated: true } },
    });
    expect(service.command('h-v', 'pet.update', { ...base, birthEstimated: true })).toMatchObject({ value: { profile: { birthEstimated: false } } });
    expect(service.command('h-v', 'pet.update', { ...base, birthEstimated: 'sim' })).toEqual({ ok: false, error: 'invalid' });
  });
});
