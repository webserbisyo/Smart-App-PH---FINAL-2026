'use client';

import Link from 'next/link';
import { imageSources, words, type Banner, type Storefront } from '@smartapp/core';
import { BrandPanel } from '@smartapp/ui/compositions/brand-panel';
import { BannerCarousel, type BannerSlide } from '@smartapp/ui/compositions/banner-carousel';
import { useShop } from '../../shell/components/shop-context';

export interface HomeBannersProps {
  storefront: Storefront;
}

const SIZES = '(min-width: 1280px) 1120px, 100vw';

// The banner's button (decision R42): an item's sheet, a category on the menu, or Rewards while the
// stamp card is on. A link the shop can no longer serve is simply left off.
function bannerAction(
  banner: Banner,
  slug: string,
  rewardsOn: boolean,
): BannerSlide['action'] | undefined {
  const link = banner.link;
  if (!link) return undefined;
  const label = words.storefrontShell.home.bannerLink[link.kind];
  if (link.kind === 'rewards') {
    return rewardsOn ? { label, link: <Link href={`/${slug}/rewards`} /> } : undefined;
  }
  if (!link.targetId) return undefined;
  const param = link.kind === 'item' ? 'item' : 'cat';
  return {
    label,
    link: <Link href={`/${slug}/menu?${param}=${encodeURIComponent(link.targetId)}`} />,
  };
}

export function HomeBanners({ storefront }: HomeBannersProps) {
  const { slug } = useShop();
  const { banners, bannerSeconds } = storefront.look;
  const { name, tagline, logo } = storefront.info;

  if (banners.length === 0) {
    return (
      <BrandPanel
        name={name}
        tagline={tagline ?? undefined}
        logo={logo ? imageSources(logo) : null}
        ratio="21:9"
      />
    );
  }

  const rewardsOn = storefront.stampCard.status !== 'off';
  const slides: BannerSlide[] = banners.map((banner) => ({
    src: imageSources(banner.ref),
    alt: banner.alt,
    title: banner.title,
    description: banner.description,
    action: bannerAction(banner, slug, rewardsOn),
  }));

  return (
    <BannerCarousel
      slides={slides}
      seconds={bannerSeconds}
      ratio="21:9"
      sizes={SIZES}
      labels={words.storefrontShell.home.carousel}
      fallbackText={name}
    />
  );
}
