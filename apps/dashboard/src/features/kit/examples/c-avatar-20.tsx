import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@smartapp/ui/components/avatar';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border p-1 shadow-sm shadow-foreground/5">
      <AvatarGroup>
        <Avatar className="size-7">
          <AvatarImage src={shop.face(0)} alt="Liam Thompson" />
          <AvatarFallback>LT</AvatarFallback>
        </Avatar>
        <Avatar className="size-7">
          <AvatarImage src={shop.face(1)} alt="Nick Johnson" />
          <AvatarFallback>NJ</AvatarFallback>
        </Avatar>
        <Avatar className="size-7">
          <AvatarImage src={shop.face(2)} alt="Maria Garcia" />
          <AvatarFallback>MG</AvatarFallback>
        </Avatar>
        <Avatar className="size-7">
          <AvatarImage src={shop.face(3)} alt="@leerob" />
          <AvatarFallback>CH</AvatarFallback>
        </Avatar>
      </AvatarGroup>

      <p className="me-1.5 text-xs text-muted-foreground">
        Trusted by <span className="font-semibold text-foreground">100K+</span> users.
      </p>
    </div>
  );
}
