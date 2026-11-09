import { beforeEach, describe, expect, it } from 'vitest';
import type { CareView, ConditionView, DiaryEntryView, MealView, SitterLinkView, VisitView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { careReminders } from './care';
import type { Context } from './context';
import { GroupService } from './group-service';
import { visitReminders } from './health';

const VALERIA = 'souza.pereira.valeria@gmail.com';
let service: GroupService;
let sql: ReturnType<typeof memorySql>;
const clock = fixedClock('2026-11-04T15:00:00Z');

beforeEach(() => {
  sql = memorySql();
  clock.set('2026-11-04T15:00:00Z');
  service = new GroupService(sql, clock, sequentialIds());
  service.migrate();
  service.signIn({ sub: 's', email: VALERIA, name: 'Valéria', picture: null }, 'h-v', [VALERIA]);
});

const query = <T>(name: string): T => (service.query('h-v', name, {}) as { value: T }).value;
const ctx = (): Context => ({ sql, clock, ids: sequentialIds() });

describe('care', () => {
  it('registers a record for several pets and removes it', () => {
    const result = service.command('h-v', 'care.add', {
      petIds: ['pet-berenice', 'pet-panda'],
      category: 'parasite',
      item: 'Vermífugo',
      doneOn: '2026-10-01',
      intervalDays: 90,
    });
    expect(result).toMatchObject({ ok: true, changed: ['care'] });
    const list = query<CareView[]>('care');
    expect(list.map((c) => [c.petId, c.item, c.intervalDays, c.byName])).toEqual([
      ['pet-berenice', 'Vermífugo', 90, 'Valéria'],
      ['pet-panda', 'Vermífugo', 90, 'Valéria'],
    ]);
    expect(service.command('h-v', 'care.remove', { careId: list[0].id })).toMatchObject({ ok: true });
    expect(query<CareView[]>('care')).toHaveLength(1);
  });

  it('saves nothing for an unknown pet or invalid input', () => {
    const base = { category: 'hygiene', item: 'Banho', doneOn: '2026-10-01' };
    expect(service.command('h-v', 'care.add', { ...base, petIds: ['pet-pacoca', 'nope'] })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command('h-v', 'care.add', { ...base, petIds: [] })).toEqual({ ok: false, error: 'invalid' });
    expect(query<CareView[]>('care')).toEqual([]);
  });

  it('reminds only the parasite items, at their next due date', () => {
    service.command('h-v', 'care.add', { petIds: ['pet-pacoca'], category: 'parasite', item: 'Antipulgas', doneOn: '2026-10-01', intervalDays: 30 });
    service.command('h-v', 'care.add', { petIds: ['pet-pacoca'], category: 'hygiene', item: 'Banho', doneOn: '2026-10-01', intervalDays: 15 });
    expect(careReminders(ctx())).toEqual([{ petId: 'pet-pacoca', item: 'Antipulgas', dueOn: '2026-10-31', tab: 'cuidados' }]);
  });
});

describe('conditions', () => {
  it('adds, resolves, reopens and removes', () => {
    const added = service.command('h-v', 'condition.add', { petId: 'pet-panda', name: 'Doença renal', grave: true });
    expect(added).toMatchObject({ ok: true, value: { name: 'Doença renal', grave: true, resolvedOn: null } });
    const [condition] = query<ConditionView[]>('conditions');
    expect(service.command('h-v', 'condition.resolve', { conditionId: condition.id })).toMatchObject({ value: { resolvedOn: '2026-11-04' } });
    expect(service.command('h-v', 'condition.resolve', { conditionId: condition.id, resolvedOn: null })).toMatchObject({ value: { resolvedOn: null } });
    expect(service.command('h-v', 'condition.resolve', { conditionId: condition.id, resolvedOn: '2026-12-01' })).toEqual({ ok: false, error: 'invalid' });
    expect(service.command('h-v', 'condition.remove', { conditionId: condition.id })).toMatchObject({ ok: true });
    expect(query<ConditionView[]>('conditions')).toEqual([]);
  });
});

describe('visits', () => {
  it('registers a consulta with a return that becomes a reminder', () => {
    const result = service.command('h-v', 'visit.add', {
      petId: 'pet-berenice',
      kind: 'consulta',
      onDate: '2026-11-01',
      title: 'Check-up',
      notes: 'Tudo certo',
      returnOn: '2026-12-01',
    });
    expect(result).toMatchObject({ ok: true, changed: ['visits'], value: { title: 'Check-up', returnOn: '2026-12-01', byName: 'Valéria' } });
    expect(visitReminders(ctx())).toEqual([{ petId: 'pet-berenice', item: 'Retorno: Check-up', dueOn: '2026-12-01', tab: 'saude' }]);
    const [visit] = query<VisitView[]>('visits');
    expect(service.command('h-v', 'visit.remove', { visitId: visit.id })).toMatchObject({ ok: true });
    expect(service.command('h-v', 'visit.remove', { visitId: visit.id })).toEqual({ ok: false, error: 'not_found' });
  });

  it('refuses a future exame', () => {
    expect(service.command('h-v', 'visit.add', { petId: 'pet-berenice', kind: 'exame', onDate: '2026-11-10', title: 'Hemograma' })).toEqual({
      ok: false,
      error: 'invalid',
    });
  });
});

describe('diary and meals', () => {
  it('writes and removes a diary entry', () => {
    expect(service.command('h-v', 'diary.add', { petId: 'pet-panda', text: 'Comeu pouco' })).toMatchObject({
      ok: true,
      value: { onDate: '2026-11-04', text: 'Comeu pouco' },
    });
    const [entry] = query<DiaryEntryView[]>('diary');
    expect(service.command('h-v', 'diary.remove', { entryId: entry.id })).toMatchObject({ ok: true });
  });

  it('lists meals by time of day', () => {
    service.command('h-v', 'meal.add', { petId: 'pet-panda', at: '19:00', amount: '1 sachê' });
    service.command('h-v', 'meal.add', { petId: 'pet-panda', at: '07:00', amount: '30 g' });
    expect(query<MealView[]>('meals').map((m) => m.at)).toEqual(['07:00', '19:00']);
    expect(service.command('h-v', 'meal.add', { petId: 'pet-panda', at: '25:00' })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('sitter links', () => {
  function create(days = 2): SitterLinkView {
    const result = service.command('h-v', 'sitter.create', { label: 'Ana', petIds: ['pet-pacoca'], note: 'Chave com o porteiro', days });
    return (result as { value: SitterLinkView }).value;
  }

  it('opens the manual without a session while the link is valid', () => {
    service.command('h-v', 'pet.update', {
      petId: 'pet-pacoca',
      name: 'Paçoca',
      allergies: [{ kind: 'drug', description: 'Dipirona' }],
      weightAlertPercent: 10,
    });
    service.command('h-v', 'condition.add', { petId: 'pet-pacoca', name: 'Epilepsia', grave: true, notes: 'Crises raras' });
    service.command('h-v', 'condition.add', { petId: 'pet-pacoca', name: 'Otite', grave: false });
    service.command('h-v', 'meal.add', { petId: 'pet-pacoca', at: '08:00', amount: '100 g' });
    const link = create();
    expect(link).toMatchObject({ label: 'Ana', expiresOn: '2026-11-05', expired: false, petIds: ['pet-pacoca'] });

    const manual = service.sitterManual(link.token);
    expect(manual).toMatchObject({ label: 'Ana', note: 'Chave com o porteiro', tutors: [] });
    expect(manual?.pets).toHaveLength(1);
    expect(manual?.pets[0]).toMatchObject({
      name: 'Paçoca',
      allergies: [{ kind: 'drug', description: 'Dipirona' }],
      graveConditions: [{ name: 'Epilepsia', notes: 'Crises raras' }],
    });
    expect(manual?.pets[0].meals.map((m) => m.at)).toEqual(['08:00']);
  });

  it('stops opening after the last day and once revoked', () => {
    const link = create(1);
    clock.set('2026-11-05T15:00:00Z');
    expect(service.sitterManual(link.token)).toBeNull();
    expect(query<SitterLinkView[]>('sitterLinks')[0].expired).toBe(true);

    clock.set('2026-11-04T15:00:00Z');
    const other = create();
    expect(service.command('h-v', 'sitter.revoke', { linkId: other.id })).toMatchObject({ ok: true, changed: ['sitter'] });
    expect(service.sitterManual(other.token)).toBeNull();
    expect(query<SitterLinkView[]>('sitterLinks').map((l) => l.id)).toEqual([link.id]);
  });

  it('serves photos only of the pets the link covers', () => {
    service.command('h-v', 'pet.setPhoto', { petId: 'pet-panda', image: 'AAAA' });
    const link = create();
    expect(service.sitterPhoto(link.token, 'pet-panda')).toBeNull();
    expect(service.sitterManual('nope')).toBeNull();
  });

  it('needs at least one existing pet', () => {
    expect(service.command('h-v', 'sitter.create', { label: 'Ana', petIds: ['nope'] })).toEqual({ ok: false, error: 'not_found' });
    expect(service.command('h-v', 'sitter.create', { label: 'Ana', petIds: [] })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('admission, retirement and lent tutoria', () => {
  const pets = () => query<{ id: string; tutorName: string | null; tutorUntil: string | null; tutorReturnName: string | null }[]>('pets');

  it('admits a new pet with the actor as tutor', () => {
    const result = service.command('h-v', 'pet.create', { name: ' Tico ', species: 'dog' });
    expect(result).toMatchObject({ ok: true, value: { profile: { name: 'Tico' }, species: 'dog', tutorName: 'Valéria', arrivedOn: '2026-11-04' } });
    expect(service.command('h-v', 'pet.create', { name: 'Tico', species: 'fish' })).toEqual({ ok: false, error: 'invalid' });
  });

  it('retires a pet: it leaves the lists and its reminders stop', () => {
    service.command('h-v', 'care.add', { petIds: ['pet-panda'], category: 'parasite', item: 'Vermífugo', doneOn: '2026-10-01', intervalDays: 90 });
    expect(service.command('h-v', 'pet.retire', { petId: 'pet-panda' })).toMatchObject({ ok: true, changed: ['pets'] });
    expect(pets().map((p) => p.id)).not.toContain('pet-panda');
    expect(query<CareView[]>('care')).toEqual([]);
    expect(careReminders(ctx())).toEqual([]);
    expect(query<{ id: string; retiredOn: string }[]>('retiredPets')).toMatchObject([{ id: 'pet-panda', retiredOn: '2026-11-04' }]);
  });

  it('lends the tutoria until a day, then gives it back', () => {
    service.command('h-v', 'invite.create', { email: 'csrgamboa@gmail.com' });
    service.signIn({ sub: 'c', email: 'csrgamboa@gmail.com', name: 'Cesar', picture: null }, 'h-c', []);
    const cesar = (service.query('h-c', 'me', {}) as { value: { id: string } }).value.id;
    expect(service.command('h-v', 'pet.lendTutoria', { petId: 'pet-berenice', memberId: cesar, until: '2026-11-04' })).toEqual({
      ok: false,
      error: 'invalid',
    });
    expect(service.command('h-v', 'pet.lendTutoria', { petId: 'pet-berenice', memberId: cesar, until: '2026-11-10' })).toMatchObject({
      ok: true,
      value: { tutorName: 'Cesar', tutorUntil: '2026-11-10', tutorReturnName: 'Valéria' },
    });
    clock.set('2026-11-09T15:00:00Z');
    expect(service.tick().changed).toEqual([]);
    clock.set('2026-11-10T15:00:00Z');
    expect(service.tick().changed).toEqual(['pets']);
    expect(pets().find((p) => p.id === 'pet-berenice')).toMatchObject({ tutorName: 'Valéria', tutorUntil: null, tutorReturnName: null });
  });
});
