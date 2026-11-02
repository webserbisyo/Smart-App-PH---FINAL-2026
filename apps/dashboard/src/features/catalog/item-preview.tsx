import * as React from 'react';
import { catalogWords, itemPriceLabel, type Variant } from '@smartapp/core';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { Badge } from '@smartapp/ui/components/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@smartapp/ui/components/carousel';
import { CatalogPhoto } from './catalog-photo.js';
import { cn } from 'cn';

export interface ItemPreviewProps {
  name: string;
  description: string;
  photos: readonly string[];
  variants: readonly Variant[];
  choiceNames: readonly string[];
  featured: boolean;
  isNew: boolean;
}

// What a customer sees: the item sheet's square photo carousel with dots (as on the storefront,
// c-carousel-11 without autoplay), then name, price, description and choices.
export function ItemPreview({
  name,
  description,
  photos,
  variants,
  choiceNames,
  featured,
  isNew,
}: ItemPreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="relative">
        <PreviewPhotos photos={photos} />
        <div className="absolute top-2 left-2 flex gap-1">
          {featured ? <Badge>{catalogWords.previewFeatured}</Badge> : null}
          {isNew ? <Badge variant="secondary">{catalogWords.previewNew}</Badge> : null}
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              'line-clamp-2 text-sm font-semibold text-foreground',
              !name.trim() && 'text-muted-foreground',
            )}
          >
            {name.trim() || catalogWords.previewName}
          </h3>
          <span className="shrink-0 text-sm font-bold tabular">
            {itemPriceLabel({ variants: [...variants] })}
          </span>
        </div>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {description.trim() || catalogWords.previewDescription}
        </p>
        {choiceNames.length > 0 ? (
          <p className="text-xs font-medium text-foreground">
            {catalogWords.previewChoices(choiceNames.join(', '))}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PreviewPhotos({ photos }: { photos: readonly string[] }) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api]);

  if (photos.length <= 1) {
    return (
      <AspectRatio ratio={1} className="overflow-hidden bg-muted">
        <CatalogPhoto photoRef={photos[0]} alt="" size="lg" className="size-full rounded-none" />
      </AspectRatio>
    );
  }

  return (
    <Carousel setApi={setApi} className="w-full bg-muted">
      <CarouselContent className="ml-0">
        {photos.map((photo, index) => (
          <CarouselItem key={photo} className="pl-0">
            <AspectRatio ratio={1} className="overflow-hidden">
              <CatalogPhoto
                photoRef={photo}
                alt={catalogWords.photoAlt(index + 1)}
                size="lg"
                className="size-full rounded-none"
              />
            </AspectRatio>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="absolute inset-x-0 bottom-3 flex justify-center">
        <div className="flex items-center gap-1 rounded-full border glass px-1 shadow-sm">
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              aria-label={catalogWords.photoShow(index + 1)}
              aria-current={index === current ? 'true' : undefined}
              onClick={() => api?.scrollTo(index)}
              className="flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  'h-1.5 rounded-full transition-all duration-base ease-standard motion-reduce:transition-none',
                  index === current ? 'w-4 bg-foreground' : 'w-1.5 bg-foreground/35',
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </Carousel>
  );
}
