'use client';

import { isIosSafari } from './install-rules';
import { isStandalone } from './install-store';

// Order status notifications (T13). iPhone only allows them once the shop is on the home screen.
export const PUSH_STATES = ['unsupported', 'needs_install', 'denied', 'ask', 'granted'] as const;
export type PushState = (typeof PUSH_STATES)[number];

export function pushState(): PushState {
  if (isIosSafari(navigator.userAgent) && !isStandalone()) return 'needs_install';
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  return Notification.permission === 'granted' ? 'granted' : 'ask';
}

export type EnablePushResult =
  { ok: true; subscription: PushSubscriptionJSON | null } | { ok: false; reason: 'denied' };

/** The base64url key from the API as the bytes `pushManager.subscribe` takes. */
function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Asks once, on the customer's tap, then subscribes through the worker with the platform key (launch phase
 * 5). Sample data has no key: the choice stays on the phone with no subscription.
 */
export async function enablePush(key: string | null): Promise<EnablePushResult> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return { ok: true, subscription: null };
  const existing = await registration.pushManager.getSubscription();
  if (existing || !key) return { ok: true, subscription: existing ? existing.toJSON() : null };
  const made = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(key),
  });
  return { ok: true, subscription: made.toJSON() };
}

/** Dev only: shows what an order update looks like, through the worker when it runs. */
export async function showTestNotification(input: {
  title: string;
  body: string;
  url: string;
  icon: string | undefined;
}): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const options = {
    body: input.body,
    data: { url: input.url },
    ...(input.icon ? { icon: input.icon } : {}),
  };
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) await registration.showNotification(input.title, options);
  else new Notification(input.title, options);
  return true;
}
