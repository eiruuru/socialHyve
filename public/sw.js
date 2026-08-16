self.addEventListener('push', (event) => {
  let payload = { title: 'SocialHyve', body: '', href: '/app/calendar' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // use defaults
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/favicon.ico',
      data: { href: payload.href || '/app/calendar' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = event.notification.data?.href || '/app/calendar';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(href);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(href);
      return undefined;
    }),
  );
});
