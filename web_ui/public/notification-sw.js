self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {};
  }

  const title = payload.title || 'LegacyKeeper';
  const options = {
    body: payload.body || 'You have a new notification.',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    image: payload.image || undefined,
    data: payload.data || {},
    tag: payload.tag || undefined,
    renotify: Boolean(payload.renotify),
    requireInteraction: Boolean(payload.requireInteraction),
    actions: Array.isArray(payload.actions) ? payload.actions : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const rawTargetUrl = data.url || '/';
  const normalizedUrl = new URL(rawTargetUrl, self.location.origin);
  const targetUrl = normalizedUrl.toString();
  const targetPath = `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (!('focus' in client)) {
          continue;
        }

        const clientUrl = new URL(client.url);
        if (clientUrl.origin !== self.location.origin) {
          continue;
        }

        if ('navigate' in client) {
          client.navigate(targetPath);
        }
        return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
