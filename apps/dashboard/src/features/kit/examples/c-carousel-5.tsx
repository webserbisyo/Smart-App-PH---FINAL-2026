import Autoplay from 'embla-carousel-autoplay';

import { Card } from '@smartapp/ui/components/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@smartapp/ui/components/carousel';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <Carousel
      plugins={[
        Autoplay({
          delay: 2000,
        }),
      ]}
      className="w-full max-w-xs"
    >
      <CarouselContent>
        {Array.from({ length: 5 }).map((_, index) => (
          <CarouselItem key={index}>
            <div className="p-1">
              <Card className="relative aspect-square overflow-hidden border-0 p-0">
                <img
                  src={shop.photo(index + 5)}
                  alt={`${shop.name} slide ${index + 1}`}
                  width={640}
                  height={640}
                  className="h-full w-full object-cover"
                />
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
