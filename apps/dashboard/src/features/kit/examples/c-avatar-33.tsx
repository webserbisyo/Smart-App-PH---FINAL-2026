import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="group/avatar relative flex items-center justify-center">
      {/* Animated ring: the success colours stand for "open now" */}
      <div className="absolute -inset-1 animate-spin-slow rounded-full bg-linear-to-tr from-success via-success-soft to-success opacity-75 blur-xs transition-all duration-slow group-hover/avatar:opacity-100 group-hover/avatar:blur-sm" />

      <Avatar className="size-10 ring-2 ring-background transition-transform duration-slow group-hover/avatar:scale-95">
        <AvatarImage src={shop.logo()} alt={shop.name} />
        <AvatarFallback>KS</AvatarFallback>
      </Avatar>
    </div>
  );
}
