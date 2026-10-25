import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="w-full max-w-md">
      <AspectRatio ratio={21 / 9} className="overflow-hidden rounded-xl border bg-muted">
        <img
          src={shop.banner(1)}
          alt={`${shop.name} banner`}
          width={800}
          height={343}
          className="h-full w-full object-cover"
        />
      </AspectRatio>
    </div>
  );
}
