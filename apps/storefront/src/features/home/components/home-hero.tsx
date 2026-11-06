'use client';

import { words, type Storefront } from '@smartapp/core';
import { HeroChips } from './hero-chips';
import { HomeBanners, type BannerTextSlots } from './home-banners';

// Banners (or the brand panel) with the open state and demo chips on top.
export function HomeHero({
  storefront,
  demo,
  show,
  bannerText,
}: {
  storefront: Storefront;
  demo: boolean;
  show?: { index: number; at: number } | undefined;
  bannerText?: BannerTextSlots | undefined;
}) {
  return (
    <section aria-label={words.storefrontShell.home.carousel.region} className="relative">
      <HomeBanners storefront={storefront} show={show} bannerText={bannerText} />
      <HeroChips demo={demo} />
    </section>
  );
}
