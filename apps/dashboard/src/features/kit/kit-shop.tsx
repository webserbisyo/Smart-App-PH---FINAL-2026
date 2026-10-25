import { createContext, useContext, type ReactNode } from 'react';
import { DEMO_MEDIA, DEMO_SHOPS, imageUrl, type DemoShopSlug } from '@smartapp/core';
import { env } from '@/app/env';

// The demo photos live in the storefront's public folder; the kit loads them from there.
const ORIGIN = env.VITE_STOREFRONT_URL;

const KitShopContext = createContext<DemoShopSlug>('kanto-smash');

export function KitShopProvider({ slug, children }: { slug: DemoShopSlug; children: ReactNode }) {
  return <KitShopContext value={slug}>{children}</KitShopContext>;
}

/** The demo shop picked on /kit, with its photos, for the ReUI examples (decision D2). */
export function useKitShop() {
  const slug = useContext(KitShopContext);
  const summary = DEMO_SHOPS.find((s) => s.slug === slug);
  const items = DEMO_MEDIA[slug].items;
  return {
    slug,
    name: summary?.name ?? slug,
    shopUrl: `${ORIGIN}/${slug}`,
    /** Item photo n (wraps around the shop's photos). */
    photo: (n: number, width: 320 | 640 = 640): string =>
      imageUrl(`demo:${slug}/items/${items[n % items.length] ?? ''}`, width, ORIGIN) ?? '',
    banner: (n: 1 | 2 | 3, width: 800 | 1600 = 800): string =>
      imageUrl(`demo:${slug}/banners/banner-${n}`, width, ORIGIN) ?? '',
    logo: (width: 128 | 256 = 128): string =>
      imageUrl(`demo:${slug}/brand/logo`, width, ORIGIN) ?? '',
    /** Logo of another demo shop, standing in for a person's photo (we ship none). */
    face: (n: number): string => {
      const others = DEMO_SHOPS.filter((s) => s.slug !== slug);
      const other = others[n % others.length]?.slug ?? slug;
      return imageUrl(`demo:${other}/brand/logo`, 128, ORIGIN) ?? '';
    },
  };
}
