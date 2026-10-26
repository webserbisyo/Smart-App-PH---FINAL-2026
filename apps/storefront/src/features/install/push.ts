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

/**
 * Asks once, on the customer's tap. Mock mode keeps the choice on the phone with no subscription; the
 * API task adds the server key and subscribes through the worker (registration.pushManager.subscribe).
 */
export async function enablePush(): Promise<EnablePushResult> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  return { ok: true, subscription: subscription ? subscription.toJSON() : null };
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
