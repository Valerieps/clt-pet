// The service worker: shows the push notifications and opens the app when one is tapped
// (docs/spec/lembretes.md). It never touches the network. Served with no-cache (public/_headers).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = typeof data.title === 'string' && data.title ? data.title : 'CLT Pet';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      tag: typeof data.tag === 'string' ? data.tag : undefined,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: typeof data.url === 'string' ? data.url : '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Only a path of this app: never a full address from the payload.
  const wanted = event.notification.data && event.notification.data.url;
  const path = typeof wanted === 'string' && wanted.startsWith('/') && !wanted.startsWith('//') ? wanted : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) return client.navigate(path).then((moved) => (moved || client).focus());
      }
      return self.clients.openWindow(path);
    }),
  );
});
