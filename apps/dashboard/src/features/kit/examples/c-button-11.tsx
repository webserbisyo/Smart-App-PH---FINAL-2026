import { Button } from '@smartapp/ui/components/button';
import { SearchIcon } from 'lucide-react';

export function Pattern() {
  return (
    <Button size="icon" aria-label="Search">
      <SearchIcon aria-hidden="true" />
    </Button>
  );
}
