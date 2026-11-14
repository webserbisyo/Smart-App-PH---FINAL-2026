import { createContext, useContext } from 'react';
import { DEMO_SHOPS, words, type ShopKind } from '@smartapp/core';
import { setMockOwnerSlug, type UserClaims } from '@smartapp/data';
import { currentSupport } from './support.js';
import { warmPreview } from './warm-preview.js';

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

// The owner's demo shop until shops come from the API; a food shop by default. In help mode (T91) the
// founder sees the shop they opened instead.
export function resolveShop(claims: UserClaims): CurrentShop {
  const helping = claims.isAdmin ? currentSupport() : null;
  const slug0 = helping?.slug ?? claims.demoShop;
  const found = DEMO_SHOPS.find((shop) => shop.slug === slug0);
  const name = found?.name ?? words.shell.myShop;
  const slug = found?.slug ?? '';
  if (slug) {
    setMockOwnerSlug(slug);
    warmPreview(slug);
  }
  return {
    slug,
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
