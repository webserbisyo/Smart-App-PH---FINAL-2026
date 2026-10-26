import { IconStack } from '@smartapp/ui/components/reui/icon-stack';
import { StoreIcon } from 'lucide-react';

export function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <IconStack aria-hidden="true">
        <StoreIcon className="size-4" />
      </IconStack>
    </div>
  );
}
