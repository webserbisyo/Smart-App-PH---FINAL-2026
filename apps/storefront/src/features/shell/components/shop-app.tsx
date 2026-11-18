'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { PublicShop } from '@smartapp/core';
import { StorefrontDataProvider } from '@smartapp/data';
import { AppToaster } from '@smartapp/ui/compositions/app-toaster';
import { dataSource } from '@/env';
import { AppWorker } from '../../install/components/app-worker';
import { InstallWatcher } from '../../install/components/install-watcher';
import { ShopProvider } from './shop-context';
import { ShopShell } from './shop-shell';

// The Preview panel (T100): development and preview builds on sample data only. Next inlines both values, so
// live builds drop this branch and the panel's code.
const PreviewSwitches =
  (process.env.NODE_ENV !== 'production' || process.env.SMARTAPP_PREVIEW === '1') &&
  dataSource === 'mock'
    ? dynamic(() => import('./preview-switches'), { ssr: false })
    : null;

/** Client root of a shop: data, toasts and the app frame. */
export function ShopApp({ shop, children }: { shop: PublicShop; children: ReactNode }) {
  return (
    <StorefrontDataProvider slug={shop.storefront.slug} source={dataSource} initialShop={shop}>
      <AppToaster>
        <ShopProvider initialShop={shop}>
          <InstallWatcher />
          <AppWorker />
          <ShopShell>{children}</ShopShell>
          {PreviewSwitches ? <PreviewSwitches slug={shop.storefront.slug} /> : null}
        </ShopProvider>
      </AppToaster>
    </StorefrontDataProvider>
  );
}
