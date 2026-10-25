import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="flex items-center gap-2">
      <Avatar className="rounded-md after:rounded-md">
        <AvatarImage src={shop.logo()} alt="Emma Wilson" className="rounded-md" />
        <AvatarFallback>EW</AvatarFallback>
      </Avatar>
      <Avatar className="rounded-lg after:rounded-lg">
        <AvatarImage src={shop.logo()} alt="Emma Wilson" className="rounded-lg" />
        <AvatarFallback>EW</AvatarFallback>
      </Avatar>
      <Avatar className="rounded-lg after:rounded-xl">
        <AvatarImage src={shop.logo()} alt="Emma Wilson" className="rounded-xl" />
        <AvatarFallback>EW</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarImage src={shop.logo()} alt="Emma Wilson" />
        <AvatarFallback>EW</AvatarFallback>
      </Avatar>
    </div>
  );
}
