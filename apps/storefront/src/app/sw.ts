// The storefront's one service worker (T13, decision T26), built by the /serwist route. Every shop app
// shares it at scope "/". Caching table: docs/decisions.md T26 and the PR body.
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist';
import { pushWords, readPushMessage } from '@smartapp/core';
import { isPrivateUrl, keepsOffline } from '../features/install/cache-rules';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const DAY = 24 * 60 * 60;

function isPageRequest(request: Request, url: URL): boolean {
  return request.headers.get('RSC') !== '1' && !url.searchParams.has('_rsc');
}

const runtimeCaching: RuntimeCaching[] = [
  { matcher: ({ url, sameOrigin }) => sameOrigin && isPrivateUrl(url), handler: new NetworkOnly() },
  {
    // Hashed file names never change, so the first copy is the right one.
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'next-static',
      plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * DAY })],
    }),
  },
  {
    // Product, banner and brand photos (/demo/**, later the storage host) and the art.
    matcher: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
    handler: new CacheFirst({
      cacheName: 'shop-images',
      plugins: [
        new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * DAY, maxAgeFrom: 'last-used' }),
      ],
    }),
  },
  {
    // The saved copy opens at once and a fresh one is fetched behind it for next time (decision T6, back
    // from T32's 3 s network wait in R47); the page itself refetches menu, stock and open/closed on load.
    // Never opened before: the network, then the offline page.
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin && keepsOffline(url.pathname) && isPageRequest(request, url),
    handler: new StaleWhileRevalidate({
      cacheName: 'shop-pages',
      matchOptions: { ignoreSearch: true },
      plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 7 * DAY })],
    }),
  },
  // Every other page goes to the network; one that can't load shows the offline page.
  { matcher: ({ request }) => request.mode === 'navigate', handler: new NetworkOnly() },
];

const precacheEntries = self.__SW_MANIFEST;

const serwist = new Serwist({
  // Empty in `next dev` (Serwist skips the precache there).
  ...(precacheEntries ? { precacheEntries } : {}),
  precacheOptions: { cleanupOutdatedCaches: true },
  // A new version waits until the customer taps Refresh (never reloads a form by itself).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [{ url: '/~offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();

// Order status pushes (T13, launch phase 5). The API words the message in the Declarative Web Push shape;
// the worker shows it and opens the receipt. A push it can't read still shows a notice (X9): an iPhone drops
// a subscription whose push shows nothing.
function pushJson(data: PushMessageData | null): unknown {
  try {
    return data?.json();
  } catch {
    return null;
  }
}

self.addEventListener('push', (event) => {
  const push = readPushMessage(pushJson(event.data), {
    title: pushWords.fallbackTitle,
    body: pushWords.fallbackBody,
  });
  event.waitUntil(
    self.registration.showNotification(push.title, {
      body: push.body,
      ...(push.tag ? { tag: push.tag } : {}),
      data: { url: push.path },
    }),
  );
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sameOriginPath(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : null;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data: unknown = event.notification.data;
  const url = isRecord(data) ? sameOriginPath(data.url) : null;
  if (!url) return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).pathname === url);
      if (open) {
        await open.focus();
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
