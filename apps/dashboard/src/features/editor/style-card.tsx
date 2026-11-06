import { CheckIcon } from 'lucide-react';
import { colourFamily, editorWords, shopPalette } from '@smartapp/core';
import type { ShopStyle } from '@smartapp/core/rules/style-designer';
import { Badge } from '@smartapp/ui/components/badge';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from 'cn';

const W = editorWords.brand;

/** The style's name: "Clean white", "Deep red", "Big gold" (decision T76). */
export function styleName(style: ShopStyle): string {
  const colour = editorWords.colours[colourFamily(style.seed)];
  const name = W.styleNames[style.id];
  return typeof name === 'function' ? name(colour) : name;
}

/** A shop look as CSS variables for the little previews: page, cards, button and the words on each. */
export function lookVars(look: {
  brandColor: string;
  surface: 'light' | 'dark';
  pageColor: string | null;
  cardColor: string | null;
}) {
  const p = shopPalette(look.brandColor, look.surface, look.pageColor, look.cardColor);
  return {
    palette: p,
    vars: {
      '--sp-60': p.shop60,
      '--sp-60-fg': p.page.foreground,
      '--sp-30': p.shop30,
      '--sp-30-fg': p.foreground,
      '--sp-10': p.shop10,
      '--sp-10-fg': p.shop10Foreground,
      '--sp-soft': p.shop10Soft,
      '--sp-price': p.shop10Text,
    },
  };
}

/** A tiny storefront: header, a banner, the stamp card with its button, two items and the bar. */
export function MiniShop({
  look,
  logo,
  ring,
  className,
}: {
  look: Parameters<typeof lookVars>[0];
  logo: string | null;
  ring?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      aria-hidden
      style={cssVars(lookVars(look).vars)}
      className={cn(
        'flex flex-col gap-1.5 overflow-hidden rounded-lg border border-border bg-(--sp-60) p-1.5 text-(--sp-60-fg)',
        className,
      )}
    >
      <span className="flex items-center gap-1">
        <span
          className={cn(
            'size-3.5 shrink-0 overflow-hidden rounded-full bg-(--sp-10)',
            ring && 'ring-1 ring-(--sp-30)',
          )}
        >
          {logo ? <img src={logo} alt="" className="size-full object-cover" /> : null}
        </span>
        <span className="h-1.5 w-2/5 rounded-full bg-current opacity-80" />
      </span>
      <span className="h-6 rounded-md bg-current opacity-15" />
      <span className="flex flex-col gap-1 rounded-md bg-(--sp-30) p-1">
        <span className="h-1 w-3/5 rounded-full bg-(--sp-30-fg) opacity-70" />
        <span className="flex gap-0.5">
          <span className="size-1.5 rounded-full bg-(--sp-10)" />
          <span className="size-1.5 rounded-full bg-(--sp-10)" />
          <span className="size-1.5 rounded-full border border-(--sp-30-fg) opacity-40" />
          <span className="size-1.5 rounded-full border border-(--sp-30-fg) opacity-40" />
        </span>
        <span className="h-2 rounded-full bg-(--sp-10)" />
      </span>
      <span className="grid grid-cols-2 gap-1">
        {[0, 1].map((i) => (
          <span key={i} className="flex flex-col gap-0.5 rounded-md bg-(--sp-30) p-1">
            <span className="h-4 rounded-sm bg-(--sp-soft)" />
            <span className="h-1 w-3/4 rounded-full bg-(--sp-30-fg) opacity-70" />
            <span className="h-1 w-1/3 rounded-full bg-(--sp-price)" />
          </span>
        ))}
      </span>
      <span className="flex justify-between rounded-full bg-(--sp-30) p-0.5">
        <span className="h-1.5 w-1/4 rounded-full bg-(--sp-10)" />
        <span className="h-1.5 w-1/6 rounded-full bg-(--sp-30-fg) opacity-30" />
        <span className="h-1.5 w-1/6 rounded-full bg-(--sp-30-fg) opacity-30" />
      </span>
    </span>
  );
}

/** One style card in "Pick a style". */
export function StyleCard({
  shopStyle: style,
  logo,
  selected,
  onUse,
}: {
  shopStyle: ShopStyle;
  logo: string | null;
  selected: boolean;
  onUse: () => void;
}) {
  const name = styleName(style);
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={W.useStyle(name)}
      onClick={onUse}
      className={cn(
        'flex min-w-0 flex-col gap-1.5 rounded-xl border p-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        selected
          ? 'border-primary ring-1 ring-primary'
          : 'border-border hover-hover:hover:bg-muted',
      )}
    >
      <MiniShop look={style} logo={logo} ring={style.ring} />
      <span className="flex min-w-0 flex-wrap items-center gap-1 px-0.5">
        <span className="min-w-0 truncate text-xs font-medium">{name}</span>
        {selected ? <CheckIcon className="size-3.5 shrink-0 text-primary" aria-hidden /> : null}
      </span>
      {style.best ? (
        <Badge variant="secondary" className="self-start">
          {W.best}
        </Badge>
      ) : null}
    </button>
  );
}
