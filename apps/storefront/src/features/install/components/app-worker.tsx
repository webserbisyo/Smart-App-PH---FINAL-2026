'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSerwist } from '@serwist/turbopack/react';
import { words } from '@smartapp/core';
import { getDeviceStorage, LAST_SHOP_SCOPE } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';
import { useShop } from '../../shell/components/shop-context';
import { keepsOffline } from '../cache-rules';

// Pages already handed to the worker in this visit (one fetch each, not one per tap).
const handed = new Set<string>();

// The update bar shows once per visit, from the worker's event or the check on open.
let offered = false;
// Refresh reloads even when the "new version in control" signal never comes (iPhone Home Screen apps) or
// came before the tap (another tab or the installed app took the update first).
const RELOAD_FALLBACK_MS = 1500;

function reloadOnNewVersion(): void {
  let reloading = false;
  const reload = () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  void navigator.serviceWorker
    .getRegistration()
    .then((registration) => registration?.waiting?.postMessage({ type: 'SKIP_WAITING' }))
    .catch(() => {});
  window.setTimeout(reload, RELOAD_FALLBACK_MS);
}

/** "New version ready · Refresh": stays until tapped or closed, never reloads by itself (T13). */
function offerUpdate(): void {
  if (offered) return;
  offered = true;
  notify({
    title: words.install.updateReady,
    persist: true,
    action: { label: words.install.refresh, onClick: reloadOnNewVersion },
  });
}

/**
 * The shop frame's side of the service worker (T13): saves Home, Menu, My orders and Rewards for offline,
 * remembers the shop for the offline page, and offers a waiting update with Refresh (never by itself). Refresh
 * hands over to the new version and reloads, with a fallback when the browser never says it took over.
 */
export function AppWorker() {
  const { slug, shop } = useShop();
  const { serwist } = useSerwist();
  const pathname = usePathname();
  const { name, kind } = shop.storefront.info;
  const { brandColor } = shop.storefront.look;

  useEffect(() => {
    const last = getDeviceStorage().lastShop;
    const saved = last.read(LAST_SHOP_SCOPE).value;
    const next = { slug, name, kind, brandColor };
    if (JSON.stringify(saved) !== JSON.stringify(next)) last.write(LAST_SHOP_SCOPE, next);
  }, [slug, name, kind, brandColor]);

  useEffect(() => {
    if (!serwist || !navigator.onLine || !keepsOffline(pathname) || handed.has(pathname)) return;
    handed.add(pathname);
    void serwist.messageSW({ type: 'CACHE_URLS', payload: { urlsToCache: [pathname] } });
  }, [serwist, pathname]);

  useEffect(() => {
    // A version that was already waiting before this page listened (a second tab, the app reopened).
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (registration?.waiting) offerUpdate();
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!serwist) return;
    serwist.addEventListener('waiting', offerUpdate);
    return () => serwist.removeEventListener('waiting', offerUpdate);
  }, [serwist]);

  return null;
}
