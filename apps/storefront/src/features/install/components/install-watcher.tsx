'use client';

import { useEffect } from 'react';
import { words } from '@smartapp/core';
import { notify } from '@smartapp/ui/compositions/notify';
import { useShop } from '../../shell/components/shop-context';
import { SPLASH_ID, SPLASH_MIN_MS } from '../install-rules';
import { watchInstall } from '../install-store';

/**
 * Listens for Chrome's install prompt and says once when the shop lands on the home screen. Also tells the
 * installed app's splash the page is ready (T94): this runs once the page has hydrated, so the splash leaves
 * when a tap works. Without it (script failed) the splash still leaves after 3 s by CSS.
 */
export function InstallWatcher() {
  const { shop } = useShop();
  const name = shop.storefront.info.name;
  useEffect(() => {
    // Once per visit, nothing to undo; a wait below zero runs at once.
    setTimeout(
      () => document.getElementById(SPLASH_ID)?.setAttribute('data-ready', ''),
      SPLASH_MIN_MS - performance.now(),
    );
  }, []);
  useEffect(
    () => watchInstall(() => notify({ title: words.install.installed(name), tone: 'success' })),
    [name],
  );
  return null;
}
