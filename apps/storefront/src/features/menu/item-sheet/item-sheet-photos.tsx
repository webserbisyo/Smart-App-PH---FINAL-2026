'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { imageSources, words, type IconKey } from '@smartapp/core';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@smartapp/ui/components/carousel';
import { ShopImage, type ShopImageRatio } from '@smartapp/ui/compositions/shop-image';
import { cn } from '@smartapp/ui/lib/utils';

export interface ItemSheetPhotosProps {
  photos: readonly string[];
  itemName: string;
  categoryIcon?: IconKey | undefined;
  activePhotoIndex?: number | undefined;
  ratio: Extract<ShopImageRatio, '4:3' | '1:1'>;
  sizes: string;
  // Glass buttons on the photo (heart, close).
  overlay?: ReactNode;
  className?: string | undefined;
}

/**
 * Full-bleed item photos (c-carousel-11, no autoplay): swipe for more, dots on a glass pill.
 * No photo: the shop-coloured tile with the category icon.
 */
export function ItemSheetPhotos({
  photos,
  itemName,
  categoryIcon,
  activePhotoIndex,
  ratio,
  sizes,
  overlay,
  className,
}: ItemSheetPhotosProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (activePhotoIndex !== undefined && api && activePhotoIndex >= 0) {
      api.scrollTo(activePhotoIndex);
    }
  }, [activePhotoIndex, api]);

  const single = photos.length <= 1;
  const first = photos[0];

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {single ? (
        <ShopImage
          src={first ? imageSources(first) : null}
          alt={itemName}
          ratio={ratio}
          fallbackIcon={categoryIcon}
          fallbackText={itemName}
          sizes={sizes}
          priority
        />
      ) : (
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent className="ml-0">
            {photos.map((photo, index) => (
              <CarouselItem key={photo} className="pl-0">
                <ShopImage
                  src={imageSources(photo)}
                  alt={words.storefrontShell.menu.itemSheet.photoAlt(itemName, index + 1)}
                  ratio={ratio}
                  fallbackIcon={categoryIcon}
                  fallbackText={itemName}
                  sizes={sizes}
                  priority={index === 0}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <div className="flex items-center gap-1 rounded-full border glass px-1 shadow-sm">
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  aria-label={words.storefrontShell.menu.itemSheet.goToPhoto(index + 1)}
                  aria-current={index === current ? 'true' : undefined}
                  onClick={() => api?.scrollTo(index)}
                  className="group/dot flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-base ease-standard',
                      index === current ? 'w-4 bg-foreground' : 'w-1.5 bg-foreground/35',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </Carousel>
      )}
      {overlay}
    </div>
  );
}
