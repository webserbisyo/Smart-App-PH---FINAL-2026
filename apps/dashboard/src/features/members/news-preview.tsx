import * as React from 'react';
import { ShoppingBagIcon } from 'lucide-react';
import { imageUrl, manilaParts, newsWords } from '@smartapp/core';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { env } from '@/app/env';
import { useShop } from '@/app/shop';
import { cn } from 'cn';

const W = newsWords.compose;
const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
const CHIP =
  'h-10 rounded-full border border-border bg-card px-3 text-sm font-semibold text-muted-foreground aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-foreground md:h-8';

export type PreviewPhone = 'android' | 'ios';

/** A saved photo ref, or a photo picked on this device (a blob or data address). */
export function newsPhotoSrc(ref: string | null | undefined, width: number): string | null {
  if (!ref) return null;
  if (/^(blob:|data:|https?:\/\/)/.test(ref)) return ref;
  return imageUrl(ref, width, env.VITE_STOREFRONT_URL);
}

/** The phone's real clock in the Philippines (Asia/Manila), ticking every few seconds. */
function useManilaClock(): { clock: string; date: string } {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5_000);
    return () => clearInterval(id);
  }, []);
  const p = manilaParts(now);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return {
    clock: `${h12}:${String(p.minute).padStart(2, '0')}`,
    date: `${DAYS[p.weekday] ?? ''}, ${p.day} ${MONTHS[p.month - 1] ?? ''}`,
  };
}

function ShopIcon({ className }: { className?: string }) {
  const shop = useShop();
  const logo = imageUrl(`demo:${shop.slug}/brand/logo`, 96, env.VITE_STOREFRONT_URL);
  return (
    <Avatar className={cn('rounded-lg after:rounded-lg', className)}>
      {logo ? <AvatarImage src={logo} alt="" className="rounded-lg" /> : null}
      <AvatarFallback className="rounded-lg text-xs font-bold">{shop.initials}</AvatarFallback>
    </Avatar>
  );
}

export interface NewsCardProps {
  title: string;
  body: string;
  photo: string | null;
  phone: PreviewPhone;
  pulled?: boolean;
}

/** One notification as the phone draws it: iPhone (icon left, no photo) or Android (logo right, big photo). */
export function NewsCard({ title, body, photo, phone, pulled = false }: NewsCardProps) {
  const shop = useShop();
  const t = title.trim() || W.previewTitle;
  const b = body.trim() || W.previewBody;
  const src = newsPhotoSrc(photo, 640);
  if (phone === 'ios') {
    return (
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 flex items-start gap-2.5 rounded-2xl bg-card/90 p-3 text-card-foreground shadow-sm ring-1 ring-foreground/8">
        <ShopIcon className="size-9" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline justify-between gap-2">
            <span className="line-clamp-1 text-sm font-semibold">{t}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{W.nowWord}</span>
          </div>
          <p className="line-clamp-4 text-sm break-words">{b}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 flex flex-col gap-1 rounded-3xl bg-card/90 p-3 text-card-foreground shadow-sm ring-1 ring-foreground/8">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShoppingBagIcon aria-hidden="true" className="size-2.5" />
        </span>
        <span className="truncate">
          {shop.name} · {W.nowWord}
        </span>
      </div>
      <div className="flex items-start gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="line-clamp-1 text-sm font-semibold">{t}</span>
          <p
            className={cn(
              'text-sm break-words text-muted-foreground',
              pulled ? 'line-clamp-4' : 'line-clamp-1',
            )}
          >
            {b}
          </p>
        </div>
        {src && !pulled ? (
          <img src={src} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <ShopIcon className="size-10 rounded-full after:rounded-full" />
        )}
      </div>
      {src && pulled ? (
        <img src={src} alt="" className="mt-1 aspect-2/1 w-full rounded-xl object-cover" />
      ) : null}
    </div>
  );
}

/** A lock screen with the live Manila clock and the news on it. */
export function LockScreen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { clock, date } = useManilaClock();
  return (
    <div
      className={cn(
        'flex flex-col gap-3 overflow-hidden rounded-4xl bg-invert px-3 pt-5 pb-6 text-invert-foreground',
        className,
      )}
    >
      <div className="flex flex-col items-center" aria-hidden="true">
        <span className="text-5xl leading-none font-light tracking-tight tabular-nums">
          {clock}
        </span>
        <span className="mt-1 text-xs opacity-80">{date}</span>
      </div>
      {children}
    </div>
  );
}

export interface NewsPreviewProps {
  title: string;
  body: string;
  photo: string | null;
  className?: string;
}

/** The composer's preview: Android first (most of our customers' phones), iPhone, and Android pulled down. */
export function NewsPreview({ title, body, photo, className }: NewsPreviewProps) {
  const [phone, setPhone] = React.useState<PreviewPhone>('android');
  const [pulled, setPulled] = React.useState(false);
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <ToggleGroup
          value={[phone]}
          onValueChange={(next) => {
            if (next[0] === 'android' || next[0] === 'ios') setPhone(next[0]);
          }}
          aria-label={W.preview}
          spacing={1.5}
        >
          <ToggleGroupItem value="android" className={CHIP}>
            {W.android}
          </ToggleGroupItem>
          <ToggleGroupItem value="ios" className={CHIP}>
            {W.ios}
          </ToggleGroupItem>
        </ToggleGroup>
        {phone === 'android' ? (
          <ToggleGroup
            value={pulled ? ['pulled'] : []}
            onValueChange={(next) => setPulled(next.includes('pulled'))}
            aria-label={W.pulled}
          >
            <ToggleGroupItem value="pulled" className={CHIP}>
              {W.pulled}
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}
      </div>
      <LockScreen>
        <NewsCard title={title} body={body} photo={photo} phone={phone} pulled={pulled} />
      </LockScreen>
      <p className="text-xs text-muted-foreground">{W.previewNote[phone]}</p>
    </div>
  );
}
