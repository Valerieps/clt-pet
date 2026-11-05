import { describe, expect, it } from 'vitest';
import { base64Url, fromBase64Url } from './crypto';
import { encryptPayload, vapidAuthorization } from './web-push';

const encoder = new TextEncoder();

async function newKeyPair() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { pair, publicKey: base64Url(publicKey), privateKey: jwk.d! };
}

/** What the browser does with the body: RFC 8291 decryption with the subscription's private key. */
async function decrypt(body: Uint8Array, browser: CryptoKeyPair, browserPublic: Uint8Array, auth: Uint8Array<ArrayBuffer>) {
  const salt = body.slice(0, 16);
  const idLength = body[20];
  const senderPublic = body.slice(21, 21 + idLength);
  const cipher = body.slice(21 + idLength);
  const senderKey = await crypto.subtle.importKey('raw', senderPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: senderKey }, browser.privateKey, 256));
  const derive = async (saltBytes: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, bytes: number) =>
    new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: saltBytes, info },
        await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']),
        bytes * 8,
      ),
    );
  const info = new Uint8Array([...encoder.encode('WebPush: info\0'), ...browserPublic, ...senderPublic]);
  const secret = await derive(auth, shared, info, 32);
  const key = await derive(new Uint8Array(salt), secret, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await derive(new Uint8Array(salt), secret, encoder.encode('Content-Encoding: nonce\0'), 12);
  const plain = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']), cipher),
  );
  return plain;
}

describe('encryptPayload', () => {
  it('produces a body only the subscribed browser can read', async () => {
    const browser = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const browserPublic = new Uint8Array(await crypto.subtle.exportKey('raw', browser.publicKey));
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const message = '{"title":"Paçoca","body":"Vacina V10 vence em 7 dias"}';

    const body = await encryptPayload({ endpoint: 'https://fcm.googleapis.com/x', p256dh: base64Url(browserPublic), auth: base64Url(auth) }, message);

    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    expect(body[20]).toBe(65);
    const plain = await decrypt(body, browser, browserPublic, auth);
    // The last byte is the 0x02 delimiter of the final record.
    expect(plain[plain.length - 1]).toBe(2);
    expect(new TextDecoder().decode(plain.slice(0, -1))).toBe(message);
  });
});

describe('vapidAuthorization', () => {
  it('signs a JWT for the push service with the VAPID key', async () => {
    const { pair, publicKey, privateKey } = await newKeyPair();
    const now = new Date('2026-11-04T12:00:00Z');

    const header = await vapidAuthorization('https://updates.push.services.mozilla.com/wpush/v2/abc', { publicKey, privateKey, subject: 'mailto:a@example.com' }, now);

    const match = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, head, claims, signature, key] = match!;
    expect(key).toBe(publicKey);
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(head)))).toEqual({ typ: 'JWT', alg: 'ES256' });
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(claims)));
    expect(decoded).toMatchObject({ aud: 'https://updates.push.services.mozilla.com', sub: 'mailto:a@example.com' });
    expect(decoded.exp).toBeGreaterThan(now.getTime() / 1000);
    expect(decoded.exp).toBeLessThanOrEqual(now.getTime() / 1000 + 86_400);
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      fromBase64Url(signature),
      encoder.encode(`${head}.${claims}`),
    );
    expect(valid).toBe(true);
  });
});
