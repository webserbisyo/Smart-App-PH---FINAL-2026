'use client';

import { words } from '@smartapp/core';
import { useOptionalShop } from '@/features/shell/components/shop-context';
import { ErrorScreen } from '@/features/shell/components/error-screen';

// A page inside a shop failed (T14): it keeps the shop's frame and colours.
export default function ShopError({ error, retry }: { error: unknown; retry: () => void }) {
  const shop = useOptionalShop();
  const W = words.storefrontShell.errorPage;
  return (
    <ErrorScreen
      error={error}
      retry={retry}
      backHref={shop ? `/${shop.slug}` : '/'}
      backLabel={shop ? W.back : W.home}
    />
  );
}
