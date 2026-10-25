import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="w-full max-w-xs">
      <AspectRatio ratio={1 / 1} className="overflow-hidden rounded-xl border bg-muted">
        <img
          src={shop.photo(3)}
          alt={`${shop.name} item photo`}
          width={640}
          height={640}
          className="h-full w-full object-cover"
        />
      </AspectRatio>
    </div>
  );
}
