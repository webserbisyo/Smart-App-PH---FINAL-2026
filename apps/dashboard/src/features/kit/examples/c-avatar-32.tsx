import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="relative w-fit">
      <Avatar className="animate-pulse ring-2 ring-success ring-offset-2 ring-offset-background">
        <AvatarImage src={shop.logo()} alt={shop.name} />
        <AvatarFallback>KS</AvatarFallback>
      </Avatar>
      <span className="absolute -right-1 -bottom-1 size-3 rounded-full border-2 border-background bg-success" />
    </div>
  );
}
