import type * as React from 'react';
import type { ShopLook as ShopLookValue } from '@smartapp/core';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';

/**
 * A "customers see" preview in the shop's real look (decision T83): its colour, light or dark page, page and
 * card colours and fonts, so it matches the storefront in the dashboard's light and dark themes alike.
 */
export function ShopLookTheme({
  look,
  children,
}: {
  look: ShopLookValue | undefined;
  children: React.ReactNode;
}) {
  if (!look) return <>{children}</>;
  return (
    <ShopTheme
      brandColor={look.brandColor}
      surface={look.surface}
      pageColor={look.pageColor}
      cardColor={look.cardColor}
      fontPair={look.fontPair}
    >
      {children}
    </ShopTheme>
  );
}
