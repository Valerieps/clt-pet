import { beforeEach, describe, expect, it } from 'vitest';
import type { PlanView } from '../../src/application/api-contract';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { careReminders } from './care';
import type { Context } from './context';
import { GroupService } from './group-service';
import { vaccineReminders } from './vaccines';

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

const plans = (): PlanView[] => (service.query('h-v', 'plans', {}) as { value: PlanView[] }).value;
const ctx = (): Context => ({ sql, clock, ids: sequentialIds() });
const plan = (input: Record<string, unknown>) =>
  service.command('h-v', 'plan.add', { petIds: ['pet-pacoca'], kind: 'parasite', item: 'Vermífugo', dueOn: '2026-12-01', intervalDays: 90, ...input });

describe('plans', () => {
  it('plans an item that never happened, for several pets, and reminds it', () => {
    expect(plan({ petIds: ['pet-pacoca', 'pet-panda'] })).toMatchObject({ ok: true, changed: ['plans'] });
    expect(plans().map((p) => [p.petId, p.kind, p.item, p.dueOn, p.intervalDays, p.byName])).toEqual([
      ['pet-pacoca', 'parasite', 'Vermífugo', '2026-12-01', 90, 'Valéria'],
      ['pet-panda', 'parasite', 'Vermífugo', '2026-12-01', 90, 'Valéria'],
    ]);
    expect(careReminders(ctx())).toEqual([
      { petId: 'pet-pacoca', item: 'Vermífugo', dueOn: '2026-12-01', tab: 'cuidados' },
      { petId: 'pet-panda', item: 'Vermífugo', dueOn: '2026-12-01', tab: 'cuidados' },
    ]);
  });

  it('replaces the earlier plan of the same item, ignoring case', () => {
    plan({});
    plan({ item: 'vermífugo ', dueOn: '2026-12-20' });
    expect(plans().map((p) => [p.item, p.dueOn])).toEqual([['vermífugo', '2026-12-20']]);
  });

  it('moves the next date of an item that already has records', () => {
    service.command('h-v', 'vaccine.add', { petIds: ['pet-pacoca'], vaccine: 'V10', appliedOn: '2026-01-10', intervalDays: 365 });
    plan({ kind: 'vaccine', item: 'V10', dueOn: '2026-11-20', intervalDays: 365 });
    expect(vaccineReminders(ctx())).toEqual([{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-20', tab: 'vacinas' }]);
  });

  it('leaves once a record of the same item is registered: the record decides from then on', () => {
    plan({ kind: 'vaccine', item: 'V10', dueOn: '2026-11-20', intervalDays: 21 });
    plan({ kind: 'hygiene', item: 'Banho', dueOn: '2026-11-10', intervalDays: 15 });
    const dose = service.command('h-v', 'vaccine.add', { petIds: ['pet-pacoca'], vaccine: 'v10', appliedOn: '2026-11-04', intervalDays: 21 });
    expect(dose).toMatchObject({ ok: true, changed: ['vaccinations', 'plans'] });
    expect(plans().map((p) => p.item)).toEqual(['Banho']);
    expect(vaccineReminders(ctx())).toEqual([{ petId: 'pet-pacoca', item: 'Vacina v10', dueOn: '2026-11-25', tab: 'vacinas' }]);
    const care = service.command('h-v', 'care.add', { petIds: ['pet-pacoca'], category: 'hygiene', item: 'Banho', doneOn: '2026-11-04', intervalDays: 15 });
    expect(care).toMatchObject({ ok: true, changed: ['care', 'plans'] });
    expect(plans()).toEqual([]);
  });

  it('keeps a plan of another pet or another kind', () => {
    plan({ petIds: ['pet-panda'] });
    service.command('h-v', 'care.add', { petIds: ['pet-pacoca'], category: 'parasite', item: 'Vermífugo', doneOn: '2026-11-04', intervalDays: 90 });
    expect(plans().map((p) => p.petId)).toEqual(['pet-panda']);
  });

  it('removes a plan', () => {
    plan({});
    expect(service.command('h-v', 'plan.remove', { planId: plans()[0].id })).toMatchObject({ ok: true, changed: ['plans'] });
    expect(plans()).toEqual([]);
    expect(service.command('h-v', 'plan.remove', { planId: 'nope' })).toEqual({ ok: false, error: 'not_found' });
  });

  it('saves nothing for an unknown pet or invalid input', () => {
    expect(plan({ petIds: ['pet-pacoca', 'nope'] })).toEqual({ ok: false, error: 'not_found' });
    expect(plan({ petIds: [] })).toEqual({ ok: false, error: 'invalid' });
    expect(plan({ kind: 'diet' })).toEqual({ ok: false, error: 'invalid' });
    expect(plan({ dueOn: '2026-02-30' })).toEqual({ ok: false, error: 'invalid' });
    expect(plan({ intervalDays: 0 })).toEqual({ ok: false, error: 'invalid' });
    expect(plans()).toEqual([]);
  });

  it('hides the plans of a retired pet', () => {
    plan({});
    service.command('h-v', 'pet.retire', { petId: 'pet-pacoca' });
    expect(plans()).toEqual([]);
    expect(careReminders(ctx())).toEqual([]);
  });
});
