import { Button } from '@smartapp/ui/components/button';
import { Settings2Icon } from 'lucide-react';

export function Pattern() {
  return (
    <Button variant="outline">
      Options
      <Settings2Icon aria-hidden="true" />
    </Button>
  );
}
