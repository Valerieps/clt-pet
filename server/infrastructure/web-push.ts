// Web Push (RFC 8030) with VAPID (RFC 8292) and aes128gcm encryption (RFC 8188 / RFC 8291), on
// WebCrypto alone: no dependency (docs/SEGURANCA.md). It runs in Workers and in Node.
import { base64Url, fromBase64Url } from './crypto';

export interface Vapid {
  /** Base64url, 65 bytes: the uncompressed P-256 public key. */
  readonly publicKey: string;
  /** Base64url, 32 bytes: the private scalar `d`. */
  readonly privateKey: string;
  /** A mailto: or https: address the push services may contact. */
  readonly subject: string;
}

export interface Subscription {
  readonly endpoint: string;
  /** Base64url, 65 bytes: the browser's public key. */
  readonly p256dh: string;
  /** Base64url, 16 bytes. */
  readonly auth: string;
}

export type SendResult = 'ok' | 'gone' | 'failed';

const encoder = new TextEncoder();
/** UTF-8 bytes, typed as the plain ArrayBuffer-backed array WebCrypto asks for. */
const bytes = (text: string) => encoder.encode(text) as Uint8Array<ArrayBuffer>;
const RECORD_SIZE = 4096;
/** How long the push service keeps a notification for a device that is off: a day. */
const TTL_SECONDS = 86_400;
/** The JWT may live at most 24 h; 12 h leaves room for clock differences. */
const JWT_SECONDS = 12 * 3600;

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

/** The request body for `message`, encrypted to the subscription (RFC 8291). */
export async function encryptPayload(subscription: Subscription, message: string): Promise<Uint8Array<ArrayBuffer>> {
  const userPublic = fromBase64Url(subscription.p256dh);
  const authSecret = fromBase64Url(subscription.auth);
  const ephemeral = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const ephemeralPublic = new Uint8Array((await crypto.subtle.exportKey('raw', ephemeral.publicKey)) as ArrayBuffer);
  const userKey = await crypto.subtle.importKey('raw', userPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  // The runtime names the field `public`; the Workers typings spell it `$public`.
  const ecdh = { name: 'ECDH', public: userKey } as unknown as Parameters<SubtleCrypto["deriveBits"]>[0];
  const shared = new Uint8Array(await crypto.subtle.deriveBits(ecdh, ephemeral.privateKey, 256));

  const keyInfo = concat(encoder.encode('WebPush: info\0'), userPublic, ephemeralPublic);
  const secret = await hkdf(authSecret, shared, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const contentKey = await hkdf(salt, secret, bytes('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, secret, bytes('Content-Encoding: nonce\0'), 12);

  // One record: the text, then the 0x02 delimiter that marks the last record.
  const plain = concat(encoder.encode(message), new Uint8Array([2]));
  const aes = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, plain));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = ephemeralPublic.length;
  return concat(header, ephemeralPublic, cipher);
}

/** The `Authorization` header that proves the Worker owns the VAPID key (RFC 8292). */
export async function vapidAuthorization(endpoint: string, vapid: Vapid, now: Date): Promise<string> {
  const publicKey = fromBase64Url(vapid.publicKey);
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: vapid.privateKey,
    x: base64Url(publicKey.slice(1, 33)),
    y: base64Url(publicKey.slice(33, 65)),
  };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const part = (value: object) => base64Url(encoder.encode(JSON.stringify(value)));
  const claims = { aud: new URL(endpoint).origin, exp: Math.floor(now.getTime() / 1000) + JWT_SECONDS, sub: vapid.subject };
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part(claims)}`;
  // WebCrypto's ECDSA signature is the raw r||s that JWS wants.
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned)));
  return `vapid t=${unsigned}.${base64Url(signature)}, k=${vapid.publicKey}`;
}

/** Sends one notification. `gone` means the push service forgot the device: drop the subscription. */
export async function sendWebPush(
  message: Subscription & { readonly payload: string },
  vapid: Vapid,
  now: Date = new Date(),
): Promise<SendResult> {
  try {
    const response = await fetch(message.endpoint, {
      method: 'POST',
      headers: {
        Authorization: await vapidAuthorization(message.endpoint, vapid, now),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(TTL_SECONDS),
        Urgency: 'normal',
      },
      body: await encryptPayload(message, message.payload),
    });
    if (response.ok) return 'ok';
    return response.status === 404 || response.status === 410 ? 'gone' : 'failed';
  } catch {
    return 'failed';
  }
}
