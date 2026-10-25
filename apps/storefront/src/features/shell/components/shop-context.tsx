'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { PublicShop } from '@smartapp/core';
import { useStorefront } from '@smartapp/data';

interface ShopContextValue {
  slug: string;
  shop: PublicShop;
  basketOpen: boolean;
  setBasketOpen: (open: boolean) => void;
}

const ShopContext = createContext<ShopContextValue | null>(null);

/** The shop for this page (fresh from the query, else what the server read) and the basket drawer state. */
export function ShopProvider({
  initialShop,
  children,
}: {
  initialShop: PublicShop;
  children: ReactNode;
}) {
  const slug = initialShop.storefront.slug;
  const shop = useStorefront(slug).data ?? initialShop;
  const [basketOpen, setBasketOpen] = useState(false);
  return <ShopContext value={{ slug, shop, basketOpen, setBasketOpen }}>{children}</ShopContext>;
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
