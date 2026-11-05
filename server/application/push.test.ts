import { beforeEach, describe, expect, it } from 'vitest';
import { base64Url } from '../infrastructure/crypto';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';
import type { GoogleProfile } from './members';
import type { DueItem, ReminderSource } from './reminders';

const profile = (email: string, name: string): GoogleProfile => ({ sub: `sub:${email}`, email, name, picture: null });
const VALERIA = 'souza.pereira.valeria@gmail.com';
const CESAR = 'csrgamboa@gmail.com';
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';
const KEYS = { p256dh: base64Url(new Uint8Array(65).fill(4)), auth: base64Url(new Uint8Array(16).fill(1)) };

let clock: ReturnType<typeof fixedClock>;
let items: DueItem[];
let service: GroupService;

// 12:00 UTC is 09:00 in Brasília.
beforeEach(() => {
  clock = fixedClock('2026-11-04T12:00:00Z');
  items = [];
  const source: ReminderSource = () => items;
  service = new GroupService(memorySql(), clock, sequentialIds(), [source], 'public-key');
  service.migrate();
  service.signIn(profile(VALERIA, 'Valéria'), 'h-val', [VALERIA]);
  service.command('h-val', 'invite.create', { email: CESAR });
  service.signIn(profile(CESAR, 'Cesar'), 'h-ces', []);
});

const subscribe = (hash: string, endpoint = ENDPOINT) => service.command(hash, 'push.subscribe', { endpoint, ...KEYS });

describe('push.subscribe', () => {
  it('gives the apps the public key', () => {
    expect(service.query('h-val', 'push', {})).toEqual({ ok: true, value: { publicKey: 'public-key' } });
  });

  it('lets a device change hands: the last member to subscribe it owns it', () => {
    expect(subscribe('h-val')).toMatchObject({ ok: true });
    expect(subscribe('h-ces')).toMatchObject({ ok: true });
    // Berenice's tutor is Valéria, who no longer owns the device; Paçoca's is Cesar, who does.
    items = [{ petId: 'pet-berenice', item: 'Vacina V4', dueOn: '2026-11-04' }];
    expect(service.tick().pushes).toEqual([]);
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-04' }];
    expect(service.tick().pushes.map((p) => p.endpoint)).toEqual([ENDPOINT]);
  });

  it.each([
    ['an endpoint on another server', { endpoint: 'https://evil.example.com/push' }],
    ['a plain http endpoint', { endpoint: 'http://fcm.googleapis.com/fcm/send/abc' }],
    ['an endpoint with credentials', { endpoint: 'https://user:pw@fcm.googleapis.com/x' }],
    ['a short key', { p256dh: base64Url(new Uint8Array(10)) }],
    ['a short auth secret', { auth: base64Url(new Uint8Array(3)) }],
  ])('refuses %s', (_name, change) => {
    expect(service.command('h-val', 'push.subscribe', { endpoint: ENDPOINT, ...KEYS, ...change })).toEqual({ ok: false, error: 'invalid' });
  });

  it('needs a signed-in member', () => {
    expect(service.command('nobody', 'push.subscribe', { endpoint: ENDPOINT, ...KEYS })).toEqual({ ok: false, error: 'unauthenticated' });
  });

  it('is unavailable where the server has no VAPID key', () => {
    const bare = new GroupService(memorySql(), clock, sequentialIds(), [], null);
    bare.migrate();
    bare.signIn(profile(VALERIA, 'Valéria'), 'h', [VALERIA]);
    expect(bare.command('h', 'push.subscribe', { endpoint: ENDPOINT, ...KEYS })).toEqual({ ok: false, error: 'unavailable' });
  });

  it('only lets a member remove their own devices', () => {
    subscribe('h-val');
    service.command('h-ces', 'push.unsubscribe', { endpoint: ENDPOINT });
    items = [{ petId: 'pet-berenice', item: 'Vacina V4', dueOn: '2026-11-04' }];
    expect(service.tick().pushes).toHaveLength(1);
    service.command('h-val', 'push.unsubscribe', { endpoint: ENDPOINT });
    items = [{ petId: 'pet-panda', item: 'Vacina V4', dueOn: '2026-11-04' }];
    expect(service.tick().pushes).toEqual([]);
  });

  it('forgets a removed member’s devices', () => {
    subscribe('h-ces');
    const [cesar] = (service.query('h-val', 'members', {}) as { value: { id: string; name: string }[] }).value.filter((m) => m.name === 'Cesar');
    service.command('h-val', 'member.remove', { memberId: cesar.id });
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-04' }];
    expect(service.tick().pushes).toEqual([]);
  });
});

describe('tick reminders', () => {
  const payloadOf = (push: { payload: string }) => JSON.parse(push.payload) as { title: string; body: string };

  beforeEach(() => {
    subscribe('h-val', 'https://fcm.googleapis.com/fcm/send/valeria');
    subscribe('h-ces', 'https://updates.push.services.mozilla.com/cesar');
  });

  it('tells the responsável 7 days ahead, in the chefe’s voice with the item and the days', () => {
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-11' }];
    const { pushes } = service.tick();
    expect(pushes).toHaveLength(1);
    expect(pushes[0].endpoint).toBe('https://updates.push.services.mozilla.com/cesar');
    expect(payloadOf(pushes[0])).toMatchObject({ title: 'Paçoca' });
    expect(payloadOf(pushes[0]).body).toContain('Vacina V10');
    expect(payloadOf(pushes[0]).body).toContain('7');
  });

  it('sends each stage once', () => {
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-11' }];
    expect(service.tick().pushes).toHaveLength(1);
    expect(service.tick().pushes).toEqual([]);
    clock.set('2026-11-05T12:00:00Z');
    // Still the 7-day stage: nothing new.
    expect(service.tick().pushes).toEqual([]);
    clock.set('2026-11-11T12:00:00Z');
    expect(service.tick().pushes).toHaveLength(1);
  });

  it('waits for 9h in Brasília', () => {
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-11' }];
    clock.set('2026-11-04T11:55:00Z');
    expect(service.tick().pushes).toEqual([]);
    clock.set('2026-11-04T12:00:00Z');
    expect(service.tick().pushes).toHaveLength(1);
  });

  it('after the date, nags the responsável and warns the reserva with the responsável’s name', () => {
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-03' }];
    const { pushes } = service.tick();
    expect(pushes.map((p) => p.endpoint).sort()).toEqual(['https://fcm.googleapis.com/fcm/send/valeria', 'https://updates.push.services.mozilla.com/cesar']);
    const reserve = pushes.find((p) => p.endpoint.includes('valeria'))!;
    expect(payloadOf(reserve).body).toContain('Responsável: Cesar');
    const responsible = pushes.find((p) => p.endpoint.includes('cesar'))!;
    expect(payloadOf(responsible).body).not.toContain('Responsável');
  });

  it('uses the neutral wording in serious mode', () => {
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-11' }];
    // serious_mode has no command yet (see the roadmap), so set the column directly.
    const sql = (service as unknown as { ctx: { sql: { run(q: string, ...b: string[]): void } } }).ctx.sql;
    sql.run("UPDATE pets SET serious_mode = 1 WHERE id = 'pet-pacoca'");
    expect(payloadOf(service.tick().pushes[0]).body).toBe('Vacina V10 de Paçoca vence em 7 dias.');
  });

  it('keeps the stage open while the responsável has not signed in', () => {
    const fresh = new GroupService(memorySql(), clock, sequentialIds(), [() => items], 'public-key');
    fresh.migrate();
    fresh.signIn(profile(VALERIA, 'Valéria'), 'h-val', [VALERIA]);
    fresh.command('h-val', 'invite.create', { email: CESAR });
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-11' }];
    expect(fresh.tick().pushes).toEqual([]);
    fresh.signIn(profile(CESAR, 'Cesar'), 'h-ces', []);
    fresh.command('h-ces', 'push.subscribe', { endpoint: ENDPOINT, ...KEYS });
    expect(fresh.tick().pushes).toHaveLength(1);
  });

  it('drops devices the push service reports gone', () => {
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-11' }];
    const [push] = service.tick().pushes;
    service.dropDevices([push.endpoint]);
    items = [{ petId: 'pet-pacoca', item: 'Vacina V10', dueOn: '2026-11-04' }];
    expect(service.tick().pushes).toEqual([]);
  });
});
