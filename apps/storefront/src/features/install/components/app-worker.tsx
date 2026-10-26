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

/**
 * The shop frame's side of the service worker (T13): saves Home, Menu, My orders and Rewards for offline,
 * remembers the shop for the offline page, and offers a waiting update with Refresh (never by itself).
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
    if (!serwist) return;
    const onWaiting = () =>
      notify({
        title: words.install.updateReady,
        action: {
          label: words.install.refresh,
          onClick: () => {
            serwist.addEventListener('controlling', () => window.location.reload());
            serwist.messageSkipWaiting();
          },
        },
      });
    serwist.addEventListener('waiting', onWaiting);
    return () => serwist.removeEventListener('waiting', onWaiting);
  }, [serwist]);

  return null;
}
