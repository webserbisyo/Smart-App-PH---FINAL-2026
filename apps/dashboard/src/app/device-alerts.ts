// New-order alerts on this phone or laptop (launch phase 5, Q2): the browser side. The push worker
// (/push-sw.js) is registered only when the owner turns alerts on.

export const DEVICE_ALERT_STATES = ['unsupported', 'needs_install', 'denied', 'ready'] as const;
export type DeviceAlertState = (typeof DEVICE_ALERT_STATES)[number];

const WORKER = '/push-sw.js';
// Sample data has no push key: "this device" is one switch, kept under this name.
export const SAMPLE_DEVICE = 'sample-device';

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Reflect.get(navigator, 'standalone') === true
  );
}

export function deviceAlertState(): DeviceAlertState {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return isIos() && !isStandalone() ? 'needs_install' : 'unsupported';
  }
  if (isIos() && !isStandalone()) return 'needs_install';
  return Notification.permission === 'denied' ? 'denied' : 'ready';
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  return navigator.serviceWorker.getRegistration('/');
}

/** This device's push address, when it has one. */
export async function deviceEndpoint(): Promise<string | null> {
  if (deviceAlertState() !== 'ready') return null;
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub?.endpoint ?? null;
}

function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export type SubscribeResult =
  | { ok: true; endpoint: string; subscription: PushSubscriptionJSON | null }
  | { ok: false; reason: 'denied' };

/** Asks on the owner's tap, then subscribes this device with the platform key. */
export async function subscribeDevice(key: string | null): Promise<SubscribeResult> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };
  if (!key) return { ok: true, endpoint: SAMPLE_DEVICE, subscription: null };
  const reg =
    (await registration()) ?? (await navigator.serviceWorker.register(WORKER, { scope: '/' }));
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(key),
    }));
  return { ok: true, endpoint: sub.endpoint, subscription: sub.toJSON() };
}

/** Stops pushes to this device in the browser too; answers the address it had. */
export async function unsubscribeDevice(): Promise<string | null> {
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
