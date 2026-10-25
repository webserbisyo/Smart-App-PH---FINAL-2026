import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <Avatar className="relative">
      <AvatarImage src={shop.photo(0, 320)} alt="Classic Smash" />
      <AvatarFallback>CS</AvatarFallback>
      <AvatarBadge className="bg-success" />
      <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-medium text-primary-foreground">
        3
      </span>
    </Avatar>
  );
}
