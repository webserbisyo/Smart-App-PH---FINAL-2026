'use client';

import { useEffect, useState } from 'react';
import { imageSources, type IconKey } from '@smartapp/core';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { Card } from '@smartapp/ui/components/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@smartapp/ui/components/carousel';
import { ShopImage } from '@smartapp/ui/compositions/shop-image';
import { cn } from '@smartapp/ui/lib/utils';

export interface ItemSheetPhotosProps {
  photos: readonly string[];
  itemName: string;
  categoryIcon?: IconKey | undefined;
  activePhotoIndex?: number | undefined;
}

/**
 * Item Sheet Photos section adhering to c-carousel-11 (no autoplay) in c-aspect-ratio-2.
 * - 0 photos: ShopImage placeholder with category icon.
 * - 1 photo: Single photo in 4:3 AspectRatio.
 * - >1 photos: Embla Carousel with slide dots navigation.
 */
export function ItemSheetPhotos({
  photos,
  itemName,
  categoryIcon,
  activePhotoIndex,
}: ItemSheetPhotosProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const count = api?.scrollSnapList().length ?? photos.length;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (
      activePhotoIndex !== undefined &&
      api &&
      activePhotoIndex >= 0 &&
      activePhotoIndex < photos.length
    ) {
      api.scrollTo(activePhotoIndex);
    }
  }, [activePhotoIndex, api, photos.length]);

  if (photos.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-border bg-muted">
        <AspectRatio ratio={4 / 3}>
          <ShopImage
            src={null}
            alt={itemName}
            ratio="4:3"
            fallbackIcon={categoryIcon}
            fallbackText={itemName}
            sizes="(min-width: 768px) 480px, 100vw"
          />
        </AspectRatio>
      </div>
    );
  }

  if (photos.length === 1) {
    const photo = photos[0];
    if (!photo) return null;
    return (
      <div className="w-full overflow-hidden rounded-xl border border-border bg-muted">
        <AspectRatio ratio={4 / 3}>
          <ShopImage
            src={imageSources(photo)}
            alt={itemName}
            ratio="4:3"
            fallbackIcon={categoryIcon}
            fallbackText={itemName}
            sizes="(min-width: 768px) 480px, 100vw"
            priority
          />
        </AspectRatio>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {photos.map((photo, index) => {
            const sources = imageSources(photo);
            return (
              <CarouselItem key={photo || index}>
                <Card className="overflow-hidden border-border bg-muted p-0">
                  <AspectRatio ratio={4 / 3}>
                    {sources ? (
                      <ShopImage
                        src={sources}
                        alt={`${itemName} photo ${index + 1}`}
                        ratio="4:3"
                        fallbackIcon={categoryIcon}
                        fallbackText={itemName}
                        sizes="(min-width: 768px) 480px, 100vw"
                        priority={index === 0}
                      />
                    ) : (
                      <div className="size-full bg-muted" />
                    )}
                  </AspectRatio>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* Dots Navigation (c-carousel-11 pattern) */}
        <div className="flex justify-center gap-1.5 pt-2">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                'h-1.5 cursor-pointer rounded-full transition-all duration-300 ease-in-out',
                index === current
                  ? 'w-4 bg-primary opacity-100'
                  : 'w-1.5 bg-muted-foreground opacity-30 hover:opacity-60',
              )}
              onClick={() => api?.scrollTo(index)}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
        </div>
      </Carousel>
    </div>
  );
}
