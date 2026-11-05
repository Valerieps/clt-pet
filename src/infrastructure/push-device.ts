// This device's Web Push subscription, through the browser's service worker and Push API. The
// browser talks to its own push service; the app itself makes no request here.
import type { PushDevice, PushState, PushSubscriptionKeys } from '../application/ports';

const SERVICE_WORKER = '/sw.js';

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function toBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export function pushDevice(): PushDevice {
  return {
    async state(): Promise<PushState> {
      if (!supported()) return 'unsupported';
      if (Notification.permission === 'denied') return 'denied';
      const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER);
      return (await registration?.pushManager.getSubscription()) ? 'on' : 'off';
    },

    async enable(publicKey: string): Promise<PushSubscriptionKeys | null> {
      if (!supported()) return null;
      try {
        if ((await Notification.requestPermission()) !== 'granted') return null;
        await navigator.serviceWorker.register(SERVICE_WORKER);
        const registration = await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(publicKey) }));
        const p256dh = toBase64Url(subscription.getKey('p256dh'));
        const auth = toBase64Url(subscription.getKey('auth'));
        return p256dh && auth ? { endpoint: subscription.endpoint, p256dh, auth } : null;
      } catch {
        return null;
      }
    },

    async disable(): Promise<string | null> {
      if (!supported()) return null;
      const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER);
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return null;
      const { endpoint } = subscription;
      await subscription.unsubscribe();
      return endpoint;
    },
  };
}
