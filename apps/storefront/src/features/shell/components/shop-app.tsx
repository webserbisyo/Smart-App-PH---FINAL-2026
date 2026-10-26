'use client';

import type { ReactNode } from 'react';
import type { PublicShop } from '@smartapp/core';
import { StorefrontDataProvider } from '@smartapp/data';
import { Toaster } from '@smartapp/ui/components/toast';
import { dataSource } from '@/env';
import { AppWorker } from '../../install/components/app-worker';
import { InstallWatcher } from '../../install/components/install-watcher';
import { ShopProvider } from './shop-context';
import { ShopShell } from './shop-shell';

/** Client root of a shop: data, toasts and the app frame. */
export function ShopApp({ shop, children }: { shop: PublicShop; children: ReactNode }) {
  return (
    <StorefrontDataProvider slug={shop.storefront.slug} source={dataSource} initialShop={shop}>
      <Toaster>
        <ShopProvider initialShop={shop}>
          <InstallWatcher />
          <AppWorker />
          <ShopShell>{children}</ShopShell>
        </ShopProvider>
      </Toaster>
    </StorefrontDataProvider>
  );
}
