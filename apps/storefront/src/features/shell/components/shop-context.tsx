'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { PreviewPage, PublicShop } from '@smartapp/core';
import { useStorefront } from '@smartapp/data';

interface ShopContextValue {
  slug: string;
  shop: PublicShop;
  basketOpen: boolean;
  setBasketOpen: (open: boolean) => void;
  // The Shop info sheet (redesign R7), opened from the top bar logo and the Home info card.
  infoOpen: boolean;
  setInfoOpen: (open: boolean) => void;
  // The Editor's preview (decision T72): the shop is the owner's draft, links stay on the page.
  preview: boolean;
  // The page the Editor's preview shows (T78), so the dock lights the right tab.
  previewPage: PreviewPage | null;
}

const ShopContext = createContext<ShopContextValue | null>(null);

/**
 * The shop for this page (fresh from the query, else what the server read), the basket drawer and Shop
 * info sheet state. The Editor's preview passes the draft as `initialShop` and keeps it.
 */
export function ShopProvider({
  initialShop,
  preview = false,
  previewPage = null,
  children,
}: {
  initialShop: PublicShop;
  preview?: boolean | undefined;
  previewPage?: PreviewPage | null | undefined;
  children: ReactNode;
}) {
  const slug = initialShop.storefront.slug;
  const fresh = useStorefront(slug).data;
  const shop = preview ? initialShop : (fresh ?? initialShop);
  const [basketOpen, setBasketOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <ShopContext
      value={{ slug, shop, basketOpen, setBasketOpen, infoOpen, setInfoOpen, preview, previewPage }}
    >
      {children}
    </ShopContext>
  );
}

/** The shop, or null outside a shop's frame (the Not found page of an unknown slug). */
export function useOptionalShop(): ShopContextValue | null {
  return useContext(ShopContext);
}

export function useShop(): ShopContextValue {
  const value = useContext(ShopContext);
  if (!value) throw new Error('useShop needs a <ShopProvider> above it');
  return value;
}
