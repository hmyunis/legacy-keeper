self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Museum Alert';
  const options = {
    body: data.body || 'You have a new memory or time capsule update.',
    icon: data.icon || '/favicon.ico',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});