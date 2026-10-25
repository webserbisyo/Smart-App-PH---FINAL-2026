import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { GlobeIcon } from 'lucide-react';

export function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <span className="relative inline-flex" aria-hidden="true">
        <IconTile variant="elevated">
          <GlobeIcon />
        </IconTile>
        <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-success" />
      </span>
    </div>
  );
}
