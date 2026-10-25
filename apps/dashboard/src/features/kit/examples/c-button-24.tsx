import { Button } from '@smartapp/ui/components/button';
import { XIcon } from 'lucide-react';

export function Pattern() {
  return (
    <Button size="icon-xs" variant="outline" aria-label="Close">
      <XIcon aria-hidden="true" />
    </Button>
  );
}
