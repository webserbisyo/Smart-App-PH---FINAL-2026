// The dashboard's only service worker (launch phase 5, Q2): new-order and payment-photo alerts. It caches
// nothing and handles no page loads, so the dashboard behaves exactly as it does without it. It is registered
// only when the owner turns alerts on in Settings › Notifications.
import { pushWords, readPushMessage } from '@smartapp/core';

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: unknown };

// Serwist's build puts an empty file list here (no precache, globPatterns []).
void self.__SW_MANIFEST;

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function pushJson(data: PushMessageData | null): unknown {
  try {
    return data?.json();
  } catch {
    return null;
  }
}

// Always shows a notice, even for a push it can't read (X9): an iPhone drops a subscription that shows nothing.
self.addEventListener('push', (event) => {
  const push = readPushMessage(pushJson(event.data), {
    title: pushWords.fallbackTitle,
    body: pushWords.fallbackBody,
  });
  event.waitUntil(
    self.registration.showNotification(push.title, {
      body: push.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...(push.tag ? { tag: push.tag } : {}),
      data: { path: push.path },
    }),
  );
});

function pathOf(data: unknown): string {
  if (typeof data !== 'object' || data === null || !('path' in data)) return '/orders';
  const path = data.path;
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
    ? path
    : '/orders';
}

// A tap opens the order: an open dashboard tab moves to it, or a new one opens.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = pathOf(event.notification.data);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows[0];
      if (open) {
        await open.focus();
        if ('navigate' in open) await open.navigate(path);
        return;
      }
      await self.clients.openWindow(path);
    })(),
  );
});
