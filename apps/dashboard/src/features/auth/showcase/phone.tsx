import * as React from 'react';
import { BatteryFullIcon, SignalIcon, WifiIcon } from 'lucide-react';
import { Android } from '@smartapp/ui/components/android';
import { cn } from '@smartapp/ui/lib/utils';

const CLOCK = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const DAY = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/** Manila time the way a phone shows it: "8:12", no AM or PM. */
export function phoneClock(now: Date): string {
  return CLOCK.formatToParts(now)
    .filter((p) => p.type === 'hour' || p.type === 'minute' || p.type === 'literal')
    .map((p) => p.value)
    .join('')
    .trim();
}

/** "Saturday, November 21" in Manila. */
export function phoneDay(now: Date): string {
  return DAY.format(now);
}

/** The phone's clock, ticking each minute. */
export function useManilaNow(): Date {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** The phone's top line: Manila time on the left, signal, Wi-Fi and battery on the right. */
export function StatusBar({ now, className }: { now: Date; className?: string | undefined }) {
  return (
    <div
      className={cn(
        'flex h-10 shrink-0 items-center justify-between px-7 text-sm font-semibold tabular',
        className,
      )}
    >
      <span>{phoneClock(now)}</span>
      <span className="flex items-center gap-1">
        <SignalIcon aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
        <WifiIcon aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
        <BatteryFullIcon aria-hidden="true" className="size-4" strokeWidth={2.25} />
      </span>
    </div>
  );
}

export type PhoneSize = 'sm' | 'lg';

// The box the scaled phone takes, and the scale (380 × 830 drawn, then 60 or 70 percent).
const SIZE: Record<PhoneSize, { box: string; scale: string }> = {
  sm: { box: 'h-124.5 w-57', scale: 'scale-60' },
  lg: { box: 'h-145.25 w-66.5', scale: 'scale-70' },
};

/**
 * A neutral modern phone (T108 L13): Magic UI's Android frame drawn at its real 380 × 830 size with a real
 * 360 × 800 screen on top, so the shop screens inside lay out exactly as on a phone; the whole phone is then
 * scaled down. The screen is a picture of the tour (role img, inert): the controls sit beside it.
 */
export function ShowcasePhone({
  label,
  size = 'lg',
  children,
  className,
}: {
  label: string;
  size?: PhoneSize | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('relative shrink-0', SIZE[size].box, className)}
    >
      <div className={cn('absolute top-0 left-0 h-207.5 w-95 origin-top-left', SIZE[size].scale)}>
        <Android width={380} height={830} className="absolute inset-0 drop-shadow-xl" />
        <div
          inert
          className="absolute top-3.5 left-2.25 flex h-200 w-90 flex-col overflow-hidden rounded-4xl bg-background"
        >
          {children}
        </div>
        {/* The punch-hole camera, drawn again above the screen. */}
        <span
          aria-hidden="true"
          className="light absolute top-4.75 left-45 flex size-4.5 items-center justify-center rounded-full bg-foreground"
        >
          <span className="size-2 rounded-full bg-muted-foreground" />
        </span>
      </div>
    </div>
  );
}
