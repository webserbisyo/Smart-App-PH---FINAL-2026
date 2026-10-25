import { Badge } from '@smartapp/ui/components/reui/badge';

import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  return (
    <div className="flex items-center gap-1.5">
      <Avatar>
        <AvatarImage src={shop.face(0)} alt="Alex Johnson" />
        <AvatarFallback>AJ</AvatarFallback>
      </Avatar>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">Alex Johnson</span>
          <Badge variant="default" size="xs">
            Pro
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">Founder & CEO</span>
      </div>
    </div>
  );
}
