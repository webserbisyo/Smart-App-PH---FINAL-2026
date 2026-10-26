'use client';

import { useSyncExternalStore } from 'react';
import { installPlatform, type InstallPlatform } from './install-rules';

// Chrome's install prompt event (not in the DOM types yet).
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isInstallPrompt(event: Event): event is InstallPromptEvent {
  return 'prompt' in event && typeof event.prompt === 'function' && 'userChoice' in event;
}

let deferred: InstallPromptEvent | null = null;
let installedHere = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Keeps Chrome's install prompt for the Install button and hears when the app gets installed. Mounted once
 * in the shop frame; `onInstalled` shows the one-time toast.
 */
export function watchInstall(onInstalled: () => void): () => void {
  const onPrompt = (event: Event) => {
    if (!isInstallPrompt(event)) return;
    event.preventDefault();
    deferred = event;
    emit();
  };
  const onAppInstalled = () => {
    deferred = null;
    installedHere = true;
    emit();
    onInstalled();
  };
  window.addEventListener('beforeinstallprompt', onPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
  return () => {
    window.removeEventListener('beforeinstallprompt', onPrompt);
    window.removeEventListener('appinstalled', onAppInstalled);
  };
}

/** Opens Chrome's install dialog; false when there is no prompt or the customer said no. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  await event.prompt();
  const choice = await event.userChoice;
  deferred = null;
  emit();
  return choice.outcome === 'accepted';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia('(display-mode: standalone)');
  media.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', listener);
  };
}

/** Opened from the home screen (Android, desktop or iPhone). */
export function isStandalone(): boolean {
  const iosStandalone = 'standalone' in navigator && navigator.standalone === true;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}

function snapshot(): InstallPlatform {
  return installPlatform({
    standalone: installedHere || isStandalone(),
    hasPrompt: deferred !== null,
    userAgent: navigator.userAgent,
  });
}

/** How this browser can install the shop; 'installed' on the server so nothing flashes. */
export function useInstallPlatform(): InstallPlatform {
  return useSyncExternalStore(subscribe, snapshot, () => 'installed');
}
