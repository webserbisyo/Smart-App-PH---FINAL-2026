'use client';

import { cn } from 'cn';
import type { ImageSources } from '@smartapp/core/media';
import { GridPattern } from '@smartapp/ui/components/grid-pattern';
import { SHOP_IMAGE_RATIOS, type ShopImageRatio } from './shop-image';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { ShopLogo } from './shop-logo';

export interface BrandPanelProps {
  name: string;
  tagline?: string | undefined;
  logo: ImageSources | null;
  ratio?: ShopImageRatio | undefined;
  className?: string | undefined;
}

// Banner spot for a shop with no banners: name, tagline and logo on the shop surface over a faint grid.
export function BrandPanel({ name, tagline, logo, ratio = '21:9', className }: BrandPanelProps) {
  return (
    <AspectRatio
      ratio={SHOP_IMAGE_RATIOS[ratio]}
      className={cn('overflow-hidden rounded-lg border bg-shop-30', className)}
    >
      <GridPattern width={28} height={28} className="fill-shop-10/5 stroke-shop-10/15 opacity-60" />
      <div className="relative flex size-full items-center gap-4 p-4 md:gap-6 md:p-8">
        <ShopLogo name={name} src={logo} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold md:text-2xl">{name}</p>
          {tagline ? (
            <p className="line-clamp-2 text-sm text-muted-foreground md:text-base">{tagline}</p>
          ) : null}
        </div>
      </div>
    </AspectRatio>
  );
}
