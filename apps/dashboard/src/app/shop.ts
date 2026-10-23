import { createContext, useContext } from 'react';
import { DEMO_SHOPS, words, type ShopKind } from '@smartapp/core';
import type { UserClaims } from '@smartapp/data';

export interface CurrentShop {
  slug: string;
  name: string;
  kind: ShopKind;
  initials: string;
}

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// The owner's demo shop until shops come from the API; a food shop by default.
export function resolveShop(claims: UserClaims): CurrentShop {
  const found = DEMO_SHOPS.find((shop) => shop.slug === claims.demoShop);
  const name = found?.name ?? words.shell.myShop;
  return {
    slug: found?.slug ?? '',
    name,
    kind: found?.kind ?? 'food',
    initials: makeInitials(name),
  };
}

export const ShopContext = createContext<CurrentShop | null>(null);

export function useShop(): CurrentShop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error('useShop must be used inside the signed-in shell');
  return shop;
}
