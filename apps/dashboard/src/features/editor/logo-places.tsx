import type { LogoShape } from '@smartapp/core';
import { editorWords } from '@smartapp/core';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';
import { lookVars } from './style-card.js';

const W = editorWords.brand;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function Mark({
  logo,
  name,
  shape,
  className,
}: {
  logo: string | null;
  name: string;
  shape: LogoShape;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden bg-(--sp-10) font-semibold text-(--sp-10-fg)',
        shape === 'circle' ? 'rounded-full' : 'rounded-xl',
        className,
      )}
    >
      {logo ? <img src={logo} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  );
}

/** The logo in the 4 places customers see it (decision T76 C7), in the shop's own colours. */
export function LogoPlaces({
  look,
  logo,
  name,
  tagline,
}: {
  look: Parameters<typeof lookVars>[0] & { logoShape: LogoShape };
  logo: string | null;
  name: string;
  tagline: string | null;
}) {
  const tile = 'flex min-w-0 flex-col gap-1.5';
  const caption = 'text-xs text-muted-foreground';
  return (
    <section className="flex flex-col gap-2" aria-label={W.places}>
      <h4 className="text-xs font-medium text-muted-foreground">{W.places}</h4>
      <div className="grid grid-cols-2 gap-3" style={cssVars(lookVars(look).vars)}>
        <div className={tile}>
          <div className="flex h-16 items-center gap-2 rounded-lg border border-border bg-(--sp-60) px-2 text-(--sp-60-fg)">
            <Mark logo={logo} name={name} shape={look.logoShape} className="size-9 text-xs" />
            <span className="min-w-0 truncate text-xs font-semibold">{name}</span>
          </div>
          <span className={caption}>{W.placeHeader}</span>
        </div>
        <div className={tile}>
          <div className="flex h-16 items-center justify-center rounded-lg border border-border bg-muted">
            <Mark logo={logo} name={name} shape="rounded" className="size-11 rounded-2xl text-sm" />
          </div>
          <span className={caption}>{W.placeIcon}</span>
        </div>
        <div className={tile}>
          <div className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-(--sp-60) text-(--sp-60-fg)">
            <Mark logo={logo} name={name} shape="rounded" className="size-8 rounded-lg text-xs" />
            <span className="max-w-full truncate px-2 text-xs font-semibold">{name}</span>
          </div>
          <span className={caption}>{W.placeSplash}</span>
        </div>
        <div className={tile}>
          <div className="flex h-16 items-center gap-2 rounded-lg border border-border bg-card px-2">
            <Mark logo={logo} name={name} shape="rounded" className="size-9 rounded-md text-xs" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold">{name}</span>
              <span className="truncate text-xs text-muted-foreground">{tagline ?? ''}</span>
            </span>
          </div>
          <span className={caption}>{W.placeShare}</span>
        </div>
      </div>
    </section>
  );
}
