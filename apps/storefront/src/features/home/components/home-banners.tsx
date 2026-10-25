'use client';

import dynamic from 'next/dynamic';
import { imageSources, words, type Storefront } from '@smartapp/core';
import { BrandPanel } from '@smartapp/ui/compositions/brand-panel';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';

const BannerCarousel = dynamic(
  () => import('@smartapp/ui/compositions/banner-carousel').then((m) => m.BannerCarousel),
  { ssr: false },
);

export interface HomeBannersProps {
  storefront: Storefront;
}

export function HomeBanners({ storefront }: HomeBannersProps) {
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

  if (banners.length === 1) {
    const b = banners[0];
    if (!b) return null;
    return (
      <div className="overflow-hidden rounded-lg">
        <ShopImage
          src={imageSources(b.ref)}
          alt={b.alt}
          ratio="21:9"
          sizes="(min-width: 1280px) 1120px, 100vw"
          priority
        />
      </div>
    );
  }

  const slides = banners.map((b) => ({
    src: imageSources(b.ref),
    alt: b.alt,
  }));

  return (
    <div className="overflow-hidden rounded-lg">
      <BannerCarousel
        slides={slides}
        seconds={bannerSeconds}
        ratio="21:9"
        sizes="(min-width: 1280px) 1120px, 100vw"
        labels={words.storefrontShell.home.carousel}
        fallbackText={name}
      />
    </div>
  );
}
