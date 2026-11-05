// Prints a new VAPID key pair for Web Push (ADR-008). Run once: `npm run vapid`.
// The public key goes in wrangler.jsonc (VAPID_PUBLIC_KEY); the private key is a secret
// (`npx wrangler secret put VAPID_PRIVATE_KEY`, and VAPID_PRIVATE_KEY in .dev.vars locally).
import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = privateKey.export({ format: 'jwk' });
const publicJwk = publicKey.export({ format: 'jwk' });
const b64 = (text) => Buffer.from(text, 'base64url');
const raw = Buffer.concat([Buffer.from([4]), b64(publicJwk.x), b64(publicJwk.y)]);

console.log(`VAPID_PUBLIC_KEY=${raw.toString('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
console.log('\nPublic key -> wrangler.jsonc vars. Private key -> secret; never commit it.');
