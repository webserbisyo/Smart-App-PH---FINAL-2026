import { cn } from 'cn';

const SIZE = {
  sm: { mark: 'size-8', text: 'text-base' },
  md: { mark: 'size-10', text: 'text-xl' },
  lg: { mark: 'size-14', text: 'text-2xl' },
} as const;

/**
 * Our logo (T108): the gradient mark as a picture and the name as real text, so the words follow light and
 * dark (the old picture had the words baked in and "Smart" vanished on dark). The last word ("PH") is in the
 * brand blue.
 */
export function BrandLockup({
  name,
  size = 'md',
  stacked = false,
  markSrc = '/brand/smartappph-mark-96.webp',
  markSrc2x = '/brand/smartappph-mark-192.webp',
  className,
}: {
  name: string;
  size?: keyof typeof SIZE | undefined;
  stacked?: boolean | undefined;
  markSrc?: string | undefined;
  markSrc2x?: string | undefined;
  className?: string | undefined;
}) {
  const s = SIZE[size];
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5',
        stacked && 'flex-col gap-2 text-center',
        className,
      )}
    >
      <img
        src={markSrc}
        srcSet={`${markSrc} 1x, ${markSrc2x} 2x`}
        alt=""
        width={96}
        height={96}
        decoding="async"
        className={cn('shrink-0 object-contain', s.mark)}
      />
      <span className={cn('leading-none font-extrabold tracking-tight text-foreground', s.text)}>
        {words.join(' ')}
        {last ? <span className="text-primary"> {last}</span> : null}
      </span>
    </span>
  );
}
