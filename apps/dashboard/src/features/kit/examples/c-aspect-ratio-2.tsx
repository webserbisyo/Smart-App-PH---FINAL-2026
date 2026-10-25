import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="w-full max-w-md">
      <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-xl border bg-muted">
        <img
          src={shop.photo(2)}
          alt={`${shop.name} item photo`}
          width={640}
          height={640}
          className="h-full w-full object-cover"
        />
      </AspectRatio>
    </div>
  );
}
