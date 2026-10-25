import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="flex items-center gap-2">
      <Avatar className="relative">
        <AvatarImage src={shop.face(0)} alt="Nick Johnson" />
        <AvatarFallback>AJ</AvatarFallback>
        <AvatarBadge className="bg-primary" />
      </Avatar>
      <Avatar className="relative">
        <AvatarImage src={shop.face(1)} alt="Alex Johnson (away)" />
        <AvatarFallback>AJ</AvatarFallback>
        <AvatarBadge className="bg-success" />
      </Avatar>
      <Avatar className="relative">
        <AvatarImage src={shop.face(2)} alt="Sarah Chen" />
        <AvatarFallback>SC</AvatarFallback>
        <AvatarBadge className="bg-warning" />
      </Avatar>
      <Avatar className="relative">
        <AvatarImage src={shop.face(3)} alt="Michael Rodriguez" />
        <AvatarFallback>MR</AvatarFallback>
        <AvatarBadge className="bg-destructive" />
      </Avatar>
    </div>
  );
}
