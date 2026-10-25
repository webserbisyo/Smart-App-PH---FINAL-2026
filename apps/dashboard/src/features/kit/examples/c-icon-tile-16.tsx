import { IconTile } from '@smartapp/ui/components/reui/icon-tile';
import { CircleCheckIcon } from 'lucide-react';

// The `solid` variant is a filled tone with a contrasting glyph. Override the
// fill with a `bg-*` class plus a readable text color. An empty class keeps the
// primary default.
const tones = [
  '',
  'bg-info text-info-foreground',
  'bg-success text-success-foreground',
  'bg-warning text-warning-foreground',
  'bg-destructive text-destructive-foreground',
];

export function Pattern() {
  return (
    <div className="flex items-center justify-center gap-4">
      {tones.map((tone) => (
        <IconTile key={tone || 'primary'} variant="solid" className={tone} aria-hidden="true">
          <CircleCheckIcon />
        </IconTile>
      ))}
    </div>
  );
}
