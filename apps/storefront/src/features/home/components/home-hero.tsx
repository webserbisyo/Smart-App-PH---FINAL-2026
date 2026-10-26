'use client';

import { words, type Storefront } from '@smartapp/core';
import { HeroChips } from './hero-chips';
import { HomeBanners } from './home-banners';

// Banners (or the brand panel) with the open state and demo chips on top.
export function HomeHero({ storefront, demo }: { storefront: Storefront; demo: boolean }) {
  return (
    <section aria-label={words.storefrontShell.home.carousel.region} className="relative">
      <HomeBanners storefront={storefront} />
      <HeroChips demo={demo} />
    </section>
  );
}
