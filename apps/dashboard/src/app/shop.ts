import { createContext, useContext } from 'react';
import { redirect } from '@tanstack/react-router';
import { DEMO_SHOPS, words, type ShopKind } from '@smartapp/core';
import { setMockOwnerSlug, type UserClaims } from '@smartapp/data';
import { adapters, realShops } from './data.js';
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

function shopOf(slug: string, name: string, kind: ShopKind): CurrentShop {
  // Areas still on sample data follow a sample shop; a real shop's own slug changes nothing there.
  if (DEMO_SHOPS.some((shop) => shop.slug === slug)) setMockOwnerSlug(slug);
  if (slug) warmPreview(slug);
  return { slug, name, kind, initials: makeInitials(name) };
}

function sampleShop(slug0: string | undefined): CurrentShop {
  const found = DEMO_SHOPS.find((shop) => shop.slug === slug0);
  return shopOf(found?.slug ?? '', found?.name ?? words.shell.myShop, found?.kind ?? 'food');
}

/**
 * The shop the signed-in owner works in. With shops from the API (decision T116) it is the owner's own shop,
 * and an owner whose sign-up stopped before the shop step goes back to finish it. On sample data it is the
 * owner's demo shop, a food shop by default. In help mode (T91) the founder sees the shop they opened.
 */
export async function resolveShop(claims: UserClaims): Promise<CurrentShop> {
  const helping = claims.isAdmin ? currentSupport() : null;
  if (helping || claims.demoShop || !realShops) {
    return sampleShop(helping?.slug ?? claims.demoShop);
  }
  const mine = await adapters.onboarding.getMyShop();
  if (!mine) throw redirect({ to: '/signup' });
  return shopOf(mine.slug, mine.name, mine.kind);
}

export const ShopContext = createContext<CurrentShop | null>(null);

export function useShop(): CurrentShop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error('useShop must be used inside the signed-in shell');
  return shop;
}
