import { Toggle } from '@smartapp/ui/components/toggle';
import { BookmarkIcon } from 'lucide-react';

export function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <Toggle variant="outline" aria-label="Toggle bookmark">
        <BookmarkIcon className="group-aria-pressed/toggle:fill-accent-foreground" />
        Bookmark
      </Toggle>
    </div>
  );
}
