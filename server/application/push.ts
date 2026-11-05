// Push subscriptions: one per device, stored per member (ADR-008, docs/spec/lembretes.md).
import type { PushInfo } from '../../src/application/api-contract';
import { PUSH_ORIGINS } from '../../network-policy';
import { failure, nowIso, type CommandResult, type Context } from './context';
import type { Member } from './members';

const P256DH_BYTES = 65;
const AUTH_BYTES = 16;
const ENDPOINT_MAX = 1000;

function base64UrlLength(text: string): number | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  const padded = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  try {
    return atob(padded).length;
  } catch {
    return null;
  }
}

/** Whether `endpoint` is an https address on one of the push services of ADR-008. */
export function isPushEndpoint(endpoint: string): boolean {
  if (endpoint.length > ENDPOINT_MAX) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && !url.username && !url.password && PUSH_ORIGINS.includes(url.origin);
}

export function pushInfo(ctx: Context): PushInfo {
  return { publicKey: ctx.vapidPublicKey ?? null };
}

export function subscribe(
  ctx: Context,
  actor: Member,
  input: { endpoint?: unknown; p256dh?: unknown; auth?: unknown },
): CommandResult<null> {
  const { endpoint, p256dh, auth } = input;
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') return failure('invalid');
  if (!isPushEndpoint(endpoint)) return failure('invalid');
  if (base64UrlLength(p256dh) !== P256DH_BYTES || base64UrlLength(auth) !== AUTH_BYTES) return failure('invalid');
  if (!ctx.vapidPublicKey) return failure('unavailable');
  // The same device signing in as someone else takes the subscription over.
  ctx.sql.run(
    `INSERT INTO push_subscriptions (endpoint, member_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    endpoint,
    actor.id,
    p256dh,
    auth,
    nowIso(ctx),
  );
  return { ok: true, value: null, changed: [] };
}

/** A member removes only their own devices. */
export function unsubscribe(ctx: Context, actor: Member, input: { endpoint?: unknown }): CommandResult<null> {
  if (typeof input.endpoint !== 'string') return failure('invalid');
  ctx.sql.run('DELETE FROM push_subscriptions WHERE endpoint = ? AND member_id = ?', input.endpoint, actor.id);
  return { ok: true, value: null, changed: [] };
}

export interface DeviceRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function devicesOf(ctx: Context, memberId: string): DeviceRow[] {
  return ctx.sql.all<DeviceRow>('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE member_id = ?', memberId);
}

/** Forgets the devices a push service said are gone. */
export function dropDevices(ctx: Context, endpoints: readonly string[]): void {
  for (const endpoint of endpoints) ctx.sql.run('DELETE FROM push_subscriptions WHERE endpoint = ?', endpoint);
}
