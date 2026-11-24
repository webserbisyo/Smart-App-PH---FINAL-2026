import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { AvatarGroup } from '@smartapp/ui/components/avatar-group';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { cn } from 'cn';
import { orderPhotoSrc } from './order-photo.js';

export interface PhotoLine {
  name: string;
  photo: string | null;
}

/**
 * Up to 3 item photos, then "+N" (installed Avatar Group, decisions T56 and T113). Items with no photo
 * show their initials. Used on order cards, the List, Home's Upcoming and New order's basket.
 */
export function PhotoStack({
  lines,
  label,
  size = 'sm',
  className,
}: {
  lines: readonly PhotoLine[];
  label: string;
  size?: 'sm' | 'default';
  className?: string | undefined;
}) {
  if (lines.length === 0) return null;
  const px = size === 'sm' ? 24 : 32;
  return (
    <AvatarGroup size={px} max={4} aria-label={label} role="img" className={className}>
      {lines.map((line, index) => {
        const src = orderPhotoSrc(line.photo, 96);
        return (
          <Avatar key={index} size={size} className="ring-2 ring-card">
            {src ? <AvatarImage src={src} alt="" loading="lazy" /> : null}
            <AvatarFallback className="font-semibold">{initials(line.name)}</AvatarFallback>
          </Avatar>
        );
      })}
    </AvatarGroup>
  );
}

/** One item's small square photo beside its line (board cards, New order's basket); initials when none. */
export function LinePhoto({
  line,
  className,
}: {
  line: PhotoLine;
  className?: string | undefined;
}) {
  const src = orderPhotoSrc(line.photo, 96);
  return (
    <Avatar aria-hidden="true" className={cn('size-7 rounded-md after:rounded-md', className)}>
      {src ? <AvatarImage src={src} alt="" loading="lazy" className="rounded-md" /> : null}
      <AvatarFallback className="rounded-md text-xs font-semibold">
        {initials(line.name)}
      </AvatarFallback>
    </Avatar>
  );
}
