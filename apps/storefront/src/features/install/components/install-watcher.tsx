'use client';

import { useEffect } from 'react';
import { words } from '@smartapp/core';
import { notify } from '@smartapp/ui/compositions/notify';
import { useShop } from '../../shell/components/shop-context';
import { watchInstall } from '../install-store';

/** Listens for Chrome's install prompt and says once when the shop lands on the home screen. */
export function InstallWatcher() {
  const { shop } = useShop();
  const name = shop.storefront.info.name;
  useEffect(
    () => watchInstall(() => notify({ title: words.install.installed(name), tone: 'success' })),
    [name],
  );
  return null;
}
