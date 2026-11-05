import { describe, expect, it } from 'vitest';
import { base64Url } from '../infrastructure/crypto';
import { fixedClock, memorySql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';

const VALERIA = 'souza.pereira.valeria@gmail.com';
const KEYS = { p256dh: base64Url(new Uint8Array(65).fill(4)), auth: base64Url(new Uint8Array(16).fill(1)) };

describe('vaccine reminders', () => {
  it('warns about the booster of the latest dose on the real vaccination card', () => {
    const service = new GroupService(memorySql(), fixedClock('2026-11-04T12:00:00Z'), sequentialIds(), undefined, 'public-key');
    service.migrate();
    service.signIn({ sub: 's', email: VALERIA, name: 'Valéria', picture: null }, 'h', [VALERIA]);
    service.command('h', 'push.subscribe', { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', ...KEYS });
    // An old dose and a newer one: only the newer counts. Its booster is in 7 days; Berenice is Valéria's.
    service.command('h', 'vaccine.add', { petIds: ['pet-berenice'], vaccine: 'V4', appliedOn: '2024-11-11', intervalDays: 365 });
    service.command('h', 'vaccine.add', { petIds: ['pet-berenice'], vaccine: 'V4', appliedOn: '2025-11-11', intervalDays: 365 });

    const { pushes } = service.tick();

    expect(pushes).toHaveLength(1);
    const payload = JSON.parse(pushes[0].payload) as { title: string; body: string };
    expect(payload.title).toBe('Berenice');
    expect(payload.body).toContain('Vacina V4');
    expect(service.tick().pushes).toEqual([]);
  });
});
