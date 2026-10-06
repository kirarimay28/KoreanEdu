importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// config는 앱 시작 시 postMessage로 전달받음
let messaging;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    try {
      firebase.initializeApp(event.data.config);
      messaging = firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        const { title, body, icon } = payload.notification ?? {};
        self.registration.showNotification(title ?? '나랏말', {
          body: body ?? '',
          icon: icon ?? '/icon-192.png',
          badge: '/icon-192.png',
          data: payload.data,
        });
      });
    } catch (e) {
      // already initialized
      messaging = firebase.messaging();
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
